import { useEffect, useRef } from "react";

const HOT = 'a, button, input, [role="option"], [role="tab"], [role="combobox"], [data-hot]';

/**
 * A brass dot pinned to the pointer with a ring trailing behind it, going
 * dashed over anything interactive. Written straight to the DOM in one rAF
 * loop — pointer position in React state would re-render the tree every move.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || still) return;

    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;
    let shown = false;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        if (dot.current) dot.current.style.opacity = "1";
        if (ring.current) ring.current.style.opacity = "1";
      }
      const hot = (e.target as Element | null)?.closest?.(HOT) != null;
      ring.current?.setAttribute("data-hot", hot ? "true" : "false");
    };
    const onLeave = () => {
      shown = false;
      if (dot.current) dot.current.style.opacity = "0";
      if (ring.current) ring.current.style.opacity = "0";
    };
    const tick = () => {
      rx += (x - rx) * 0.19;
      ry += (y - ry) * 0.19;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
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
      <div ref={ring} className="cursor-ring" style={{ opacity: 0 }} aria-hidden="true" />
    </>
  );
}
