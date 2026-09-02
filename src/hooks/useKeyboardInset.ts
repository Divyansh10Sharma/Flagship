import { useEffect, useState } from "react";

/**
 * How many pixels the on-screen keyboard is covering at the bottom.
 *
 * `position: fixed; bottom: 0` anchors to the *layout* viewport, which does not
 * shrink when the keyboard opens — so a bottom sheet ends up underneath it and
 * the browser scrolls the page to compensate. The visual viewport does track
 * the keyboard, and the difference between the two is the inset we owe.
 *
 * Returns 0 when the keyboard is closed, or when visualViewport is unavailable.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) {
      setInset(0);
      return;
    }

    const update = () => {
      // ignore sub-pixel noise and the ~1px rounding some browsers report
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > 24 ? Math.round(covered) : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return inset;
}
