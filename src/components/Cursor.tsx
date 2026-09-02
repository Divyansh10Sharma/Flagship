import { useEffect, useRef } from "react";

const HOT = 'a, button, input, [role="option"], [role="tab"], [role="combobox"], [data-hot]';

/**
 * Two-part cursor: a dot pinned exactly to the pointer, and a ring that trails
 * it with a light lerp and swells over anything interactive.
 *
 * Everything is written straight to the DOM inside one rAF loop — putting the
 * pointer position in React state would re-render the whole tree on every
 * mousemove. Both layers are pointer-events: none, so clicks pass through.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // No custom cursor for touch, or for anyone who asked for less motion.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        if (dot.current) dot.current.style.opacity = "1";
        if (ring.current) ring.current.style.opacity = "1";
      }
      const hot = (e.target as Element | null)?.closest?.(HOT) != null;
      ring.current?.setAttribute("data-hot", hot ? "true" : "false");
    };

    const onLeave = () => {
      visible = false;
      if (dot.current) dot.current.style.opacity = "0";
      if (ring.current) ring.current.style.opacity = "0";
    };

    const tick = () => {
      // lerp: the ring lags just enough to read as weight, not as lag
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerdown", () =>
      ring.current?.style.setProperty("scale", "0.85")
    );
    document.addEventListener("pointerup", () =>
      ring.current?.style.setProperty("scale", "1")
    );
    raf = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dot} className="cursor-dot" style={{ opacity: 0 }} aria-hidden="true" />
      <div
        ref={ring}
        className="cursor-ring"
        style={{ opacity: 0, transition: "scale 160ms var(--ease-spring)" }}
        aria-hidden="true"
      />
    </>
  );
}
