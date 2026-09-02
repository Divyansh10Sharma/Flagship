import { useReducedMotion } from "motion/react";

/**
 * A navigational chart, drawn rather than blurred.
 *
 * Layers, back to front: an ink wash, a lat/long graticule that drifts one
 * cell over ~2 minutes, rhumb lines fanning from an off-centre compass point,
 * bathymetry contours along the bottom, a slow lighthouse sweep, and grain.
 *
 * All SVG and CSS transforms — the whole thing is a few kB and composites on
 * the GPU. Under reduced motion nothing moves; the chart just sits there.
 */
export default function Background() {
  const reduce = useReducedMotion();

  // Rhumb lines: 32 points of the compass, from a point up and left of centre.
  const cx = 34;
  const cy = 38;
  const rhumbs = Array.from({ length: 32 }, (_, i) => {
    const a = (i * Math.PI * 2) / 32;
    return { x2: cx + Math.cos(a) * 160, y2: cy + Math.sin(a) * 160, i };
  });

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: "var(--void)" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #071120 0%, #050A12 45%, #04080F 100%)",
        }}
      />

      {/* graticule */}
      <div
        className="absolute"
        style={{
          inset: "-120px",
          backgroundImage:
            "linear-gradient(to right, rgba(62,143,168,0.13) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(62,143,168,0.13) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          animation: reduce ? undefined : "drift-chart 120s linear infinite",
        }}
      />
      {/* every fifth line, heavier — the way a chart marks whole degrees */}
      <div
        className="absolute"
        style={{
          inset: "-120px",
          backgroundImage:
            "linear-gradient(to right, rgba(62,143,168,0.20) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(62,143,168,0.20) 1px, transparent 1px)",
          backgroundSize: "400px 400px",
          animation: reduce ? undefined : "drift-chart 120s linear infinite",
        }}
      />

      {/* rhumb lines + compass rose */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {rhumbs.map(({ x2, y2, i }) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke={i % 4 === 0 ? "rgba(201,162,39,0.16)" : "rgba(62,143,168,0.09)"}
            strokeWidth={i % 8 === 0 ? 0.16 : 0.08}
          />
        ))}
        <circle cx={cx} cy={cy} r="10" fill="none" stroke="rgba(201,162,39,0.18)" strokeWidth="0.12" />
        <circle cx={cx} cy={cy} r="16" fill="none" stroke="rgba(201,162,39,0.12)" strokeWidth="0.1" />
        <circle cx={cx} cy={cy} r="1" fill="rgba(201,162,39,0.35)" />
      </svg>

      {/* lighthouse sweep */}
      {!reduce && (
        <div
          className="absolute"
          style={{
            left: `${cx}%`,
            top: `${cy}%`,
            width: "180vmax",
            height: "180vmax",
            marginLeft: "-90vmax",
            marginTop: "-90vmax",
            background:
              "conic-gradient(from 0deg, rgba(62,143,168,0.13) 0deg, rgba(62,143,168,0.02) 26deg, transparent 60deg, transparent 360deg)",
            animation: "sweep 26s linear infinite",
          }}
        />
      )}

      {/* bathymetry — contour lines, not waves */}
      <div className="absolute inset-x-0 bottom-0 h-[38vh] overflow-hidden">
        {[0, 1, 2].map((n) => (
          <svg
            key={n}
            className="absolute bottom-0 left-0 h-full w-[200%]"
            viewBox="0 0 2880 320"
            preserveAspectRatio="none"
            style={{
              opacity: 0.5 - n * 0.12,
              transform: `translateY(${n * 26}px)`,
              animation: reduce ? undefined : `swell ${52 + n * 16}s linear infinite`,
            }}
          >
            <path
              fill="none"
              stroke="rgba(62,143,168,0.35)"
              strokeWidth="1"
              d={
                n === 0
                  ? "M0,190 C360,140 720,230 1080,180 C1440,130 1800,225 2160,175 C2520,130 2760,215 2880,185"
                  : n === 1
                    ? "M0,225 C300,180 640,255 980,215 C1320,175 1660,250 2000,210 C2340,175 2620,245 2880,215"
                    : "M0,258 C420,220 840,285 1260,250 C1680,215 2100,280 2520,248 C2700,235 2820,262 2880,252"
              }
            />
          </svg>
        ))}
      </div>

      {/* vignette keeps type off the busiest part of the chart */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 85% at 50% 10%, transparent 30%, rgba(4,8,15,0.62) 76%, rgba(4,8,15,0.9) 100%)",
        }}
      />

      {/* paper grain */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
