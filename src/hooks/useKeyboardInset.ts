import { useEffect, useState } from "react";

export type ViewportMetrics = {
  /** Pixels the on-screen keyboard is covering at the bottom. */
  inset: number;
  /** Height actually visible to the user, i.e. keyboard already subtracted. */
  height: number;
};

const initial = (): ViewportMetrics => ({
  inset: 0,
  height: typeof window === "undefined" ? 0 : window.innerHeight,
});

/**
 * Measures the visual viewport while a bottom sheet is up.
 *
 * `position: fixed; bottom: 0` anchors to the *layout* viewport, which does not
 * shrink when the keyboard opens — so a sheet ends up underneath it and the
 * browser scrolls the page to compensate. The visual viewport does track the
 * keyboard: the difference between the two is the inset we owe, and its height
 * is the only honest budget for sizing the sheet. `svh` is not a substitute —
 * it ignores the keyboard entirely.
 *
 * Falls back to window.innerHeight with a zero inset where visualViewport is
 * unavailable, which is the pre-keyboard behaviour.
 */
export function useKeyboardInset(active: boolean): ViewportMetrics {
  const [metrics, setMetrics] = useState<ViewportMetrics>(initial);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) {
      setMetrics(initial());
      return;
    }

    const update = () => {
      // ignore sub-pixel noise and the ~1px rounding some browsers report
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      const inset = covered > 24 ? Math.round(covered) : 0;
      setMetrics({ inset, height: Math.round(vv.height) });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return metrics;
}
