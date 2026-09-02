import { useReducedMotion } from "motion/react";

/**
 * The moving gradient field: three large blurred colour blobs drifting on long,
 * mismatched loops, a pair of slow waves along the bottom, and a grain layer to
 * kill the banding that big soft gradients always produce on dark screens.
 *
 * Pure CSS transforms on composited layers — no canvas, no WebGL, no rAF. Under
 * reduced motion the blobs stay exactly where they are and nothing animates.
 */
export default function Background() {
  const reduce = useReducedMotion();
  const anim = (name: string, secs: number, delay = 0) =>
    reduce ? undefined : `${name} ${secs}s ease-in-out ${delay}s infinite`;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* base wash */}
      <div className="absolute inset-0 bg-void" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #070A16 0%, #0A0D1C 40%, #0B0A1B 70%, #05060B 100%)",
        }}
      />

      {/* drifting colour */}
      <div
        className="absolute -left-[20%] -top-[25%] h-[85vh] w-[85vh] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,107,245,0.55) 0%, rgba(124,107,245,0.16) 45%, transparent 70%)",
          filter: "blur(90px)",
          animation: anim("drift-a", 26),
        }}
      />
      <div
        className="absolute -bottom-[30%] -right-[15%] h-[90vh] w-[90vh] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(74,140,255,0.5) 0%, rgba(74,140,255,0.14) 45%, transparent 70%)",
          filter: "blur(100px)",
          animation: anim("drift-b", 32, -6),
        }}
      />
      <div
        className="absolute left-[25%] top-[30%] h-[70vh] w-[70vh] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(160,86,255,0.4) 0%, rgba(88,50,170,0.12) 45%, transparent 70%)",
          filter: "blur(110px)",
          animation: anim("drift-c", 38, -14),
        }}
      />

      {/* waves — two layers at different speeds so the crest never repeats visibly */}
      <div className="absolute inset-x-0 bottom-0 h-[42vh] overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          style={{ animation: reduce ? undefined : "wave-slide 28s linear infinite", opacity: 0.5 }}
        >
          <path
            fill="rgba(124,107,245,0.10)"
            d="M0,160 C240,220 480,100 720,150 C960,200 1200,120 1440,160 C1680,220 1920,100 2160,150 C2400,200 2640,120 2880,160 L2880,320 L0,320 Z"
          />
        </svg>
        <svg
          className="absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          style={{ animation: reduce ? undefined : "wave-slide 44s linear infinite", opacity: 0.45 }}
        >
          <path
            fill="rgba(74,140,255,0.09)"
            d="M0,200 C300,140 600,240 900,190 C1200,140 1500,230 1800,195 C2100,150 2400,235 2880,185 L2880,320 L0,320 Z"
          />
        </svg>
      </div>

      {/* keeps text off the brightest part of the field */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, transparent 25%, rgba(5,6,11,0.55) 78%, rgba(5,6,11,0.85) 100%)",
        }}
      />

      {/* grain — large soft gradients band badly on dark panels without it */}
      <div
        className="absolute inset-0 opacity-[0.055] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
