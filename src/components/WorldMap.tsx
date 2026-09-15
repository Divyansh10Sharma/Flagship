import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { LngLat, World } from "../lib/geo";

type Props = {
  world: World | null;
  guess: LngLat | null;
  /** Set once the guess is locked in: the country to highlight and the point
   *  on it nearest the guess. */
  answer: { code: string; nearest: LngLat; centre: LngLat } | null;
  disabled?: boolean;
  onPlace: (p: LngLat) => void;
};

const W = 1000;
const MIN_K = 1;
const MAX_K = 60;
const DRAG_SLOP = 5; // px of movement before a press stops being a tap

type View = { k: number; x: number; y: number };

const clampView = (v: View, h: number): View => {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  return {
    k,
    x: Math.min(0, Math.max(W - W * k, v.x)),
    y: Math.min(0, Math.max(h - h * k, v.y)),
  };
};

export default function WorldMap({ world, guess, answer, disabled, onPlace }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { projection, path, H, sphere } = useMemo(() => {
    const sphere = { type: "Sphere" } as const;
    const projection = geoNaturalEarth1().fitWidth(W, sphere);
    const path = geoPath(projection);
    const [[, y0], [, y1]] = path.bounds(sphere);
    return { projection, path, H: Math.ceil(y1 - y0), sphere: path(sphere) ?? "" };
  }, []);

  const shapes = useMemo(
    () => (world ? world.all.map((f, i) => ({ key: `${f.id ?? "x"}-${i}`, d: path(f) ?? "" })) : []),
    [world, path]
  );

  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  const apply = useCallback(
    (next: View, smooth = false) => {
      setAnimate(smooth);
      setView(clampView(next, H));
    },
    [H]
  );

  /** Client pixel -> SVG viewBox units. */
  const toViewBox = useCallback((cx: number, cy: number): [number, number] | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    const p = pt.matrixTransform(m.inverse());
    return [p.x, p.y];
  }, []);

  const zoomAt = useCallback(
    (vx: number, vy: number, factor: number, smooth = false) => {
      const v = viewRef.current;
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const f = k / v.k;
      apply({ k, x: vx - (vx - v.x) * f, y: vy - (vy - v.y) * f }, smooth);
    },
    [apply]
  );

  // Wheel needs a non-passive listener to stop the page scrolling underneath.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toViewBox(e.clientX, e.clientY);
      if (!p) return;
      zoomAt(p[0], p[1], Math.exp(-e.deltaY * 0.0022));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toViewBox, zoomAt]);

  // --- pointer: tap to place, drag to pan, pinch to zoom -----------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; startX: number; startY: number; pinch: number | null }>({
    moved: false,
    startX: 0,
    startY: 0,
    pinch: null,
  });

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { moved: false, startX: e.clientX, startY: e.clientY, pinch: null };
    } else {
      gesture.current.moved = true; // a second finger is never a tap
      gesture.current.pinch = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    const g = gesture.current;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinch != null && g.pinch > 0) {
        const mid = toViewBox((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (mid) zoomAt(mid[0], mid[1], dist / g.pinch);
      }
      g.pinch = dist;
      return;
    }

    if (!g.moved && Math.hypot(next.x - g.startX, next.y - g.startY) < DRAG_SLOP) return;
    g.moved = true;
    const p0 = toViewBox(prev.x, prev.y);
    const p1 = toViewBox(next.x, next.y);
    if (!p0 || !p1) return;
    const v = viewRef.current;
    apply({ k: v.k, x: v.x + (p1[0] - p0[0]), y: v.y + (p1[1] - p0[1]) });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const had = pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.pinch = null;
    if (!had || gesture.current.moved || pointers.current.size > 0 || disabled) return;
    const p = toViewBox(e.clientX, e.clientY);
    if (!p) return;
    const v = viewRef.current;
    const lngLat = projection.invert?.([(p[0] - v.x) / v.k, (p[1] - v.y) / v.k]);
    if (lngLat && Number.isFinite(lngLat[0]) && Number.isFinite(lngLat[1])) {
      onPlace([lngLat[0], lngLat[1]]);
    }
  };

  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    gesture.current.moved = true;
  };

  // --- reveal: frame the guess and the country together ----------------------
  useEffect(() => {
    if (!answer) return;
    const pts: [number, number][] = [];
    const shape = world?.byCode[answer.code];
    if (shape) {
      const [[x0, y0], [x1, y1]] = path.bounds(shape);
      // A country straddling the antimeridian (Russia, Fiji) spans the whole
      // map; its centre is a better anchor than its bounds.
      if (x1 - x0 < W * 0.6) pts.push([x0, y0], [x1, y1]);
    }
    for (const ll of [answer.centre, guess]) {
      const p = ll && projection(ll);
      if (p) pts.push(p);
    }
    if (!pts.length) return;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs);
    const by0 = Math.min(...ys), by1 = Math.max(...ys);
    const pad = 60;
    const k = Math.min(
      12,
      Math.max(1, Math.min(W / (bx1 - bx0 + pad * 2), H / (by1 - by0 + pad * 2)))
    );
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    apply({ k, x: W / 2 - cx * k, y: H / 2 - cy * k }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);

  const reset = () => apply({ k: 1, x: 0, y: 0 }, true);

  const guessXY = guess ? projection(guess) : null;
  const nearestXY = answer ? projection(answer.nearest) : null;
  const centreXY = answer ? projection(answer.centre) : null;
  const answerShape = answer && world?.byCode[answer.code];
  const s = 1 / view.k; // keeps markers a constant size on screen

  return (
    <div className="map-frame relative w-full select-none overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        style={{ touchAction: "none", cursor: disabled ? "grab" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="application"
        aria-label="World map. Click or tap to place your guess; drag to pan, scroll or pinch to zoom."
      >
        <rect width={W} height={H} fill="var(--map-sea)" />
        <g
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transformOrigin: "0 0",
            transition: animate ? "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          }}
          onTransitionEnd={() => setAnimate(false)}
        >
          <path d={sphere} fill="var(--map-sea-deep)" />
          {shapes.map((sh) => (
            <path
              key={sh.key}
              d={sh.d}
              fill="var(--map-land)"
              stroke="var(--map-border)"
              strokeWidth={0.7}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {answerShape && (
            <path
              d={path(answerShape) ?? ""}
              fill="var(--brass)"
              stroke="#5a3b0c"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* A ring, because a micro-state is invisible even when filled. */}
          {centreXY && (
            <circle
              cx={centreXY[0]}
              cy={centreXY[1]}
              r={16 * s}
              fill="none"
              stroke="var(--brass)"
              strokeWidth={2.2}
              vectorEffect="non-scaling-stroke"
              className="map-ring"
            />
          )}

          {guessXY && nearestXY && (
            <line
              x1={guessXY[0]}
              y1={guessXY[1]}
              x2={nearestXY[0]}
              y2={nearestXY[1]}
              stroke="#f4e6c4"
              strokeWidth={2}
              strokeDasharray="6 5"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {guessXY && (
            <g transform={`translate(${guessXY[0]} ${guessXY[1]}) scale(${s})`}>
              {/* a map pin: the point of the teardrop sits exactly on the guess */}
              <path
                d="M0 0 C -3 -8 -10 -12 -10 -20 A 10 10 0 1 1 10 -20 C 10 -12 3 -8 0 0 Z"
                fill="var(--miss)"
                stroke="#2b0d08"
                strokeWidth={1.5}
              />
              <circle cy={-20} r={3.6} fill="#f4e6c4" />
            </g>
          )}
        </g>
      </svg>

      {!world && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="ledger" style={{ color: "var(--chalk)" }}>
            Unrolling the chart…
          </span>
        </div>
      )}

      <div className="absolute bottom-2 right-2 flex flex-col gap-1.5">
        <button
          type="button"
          className="map-ctl"
          aria-label="Zoom in"
          onClick={() => zoomAt(W / 2, H / 2, 1.8, true)}
        >
          +
        </button>
        <button
          type="button"
          className="map-ctl"
          aria-label="Zoom out"
          onClick={() => zoomAt(W / 2, H / 2, 1 / 1.8, true)}
        >
          −
        </button>
        <button type="button" className="map-ctl text-[11px]" aria-label="Reset view" onClick={reset}>
          ⤢
        </button>
      </div>
    </div>
  );
}
