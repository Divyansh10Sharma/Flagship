import { useMemo } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Night watch. A warm black sky with a scatter of stars, a galleon standing off
 * on the horizon, three ranks of swell rolling past at different speeds, and a
 * lantern glow low on the right that breathes.
 *
 * Deterministic star field — seeded from a fixed table rather than Math.random,
 * so the sky does not reshuffle on every re-render.
 */
export default function Background() {
  const reduce = useReducedMotion();

  const stars = useMemo(() => {
    // simple LCG so the layout is stable between renders and reloads
    let seed = 20260902;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    return Array.from({ length: 90 }, () => ({
      x: rnd() * 100,
      y: rnd() * 62,
      r: 0.4 + rnd() * 0.9,
      d: rnd() * 6,
      o: 0.2 + rnd() * 0.5,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0C0A07 0%, #120D08 38%, #0D0B08 62%, #080605 100%)",
        }}
      />

      {/* stars */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r / 6}
            fill="#F3E6C8"
            opacity={s.o}
            style={
              reduce
                ? undefined
                : { animation: `twinkle ${5 + (i % 5)}s ease-in-out ${s.d}s infinite` }
            }
          />
        ))}
      </svg>

      {/* lantern glow, low and warm */}
      <div
        className="absolute"
        style={{
          right: "-10%",
          bottom: "18%",
          width: "70vh",
          height: "70vh",
          background:
            "radial-gradient(circle, rgba(201,146,43,0.20) 0%, rgba(201,146,43,0.06) 40%, transparent 70%)",
          animation: reduce ? undefined : "lantern 9s ease-in-out infinite",
        }}
      />

      {/* the ship, hull-down on the horizon */}
      <img
        src="/ship.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className={reduce ? "absolute" : "absolute bob"}
        style={{
          left: "6%",
          bottom: "25vh",
          width: "min(300px, 46vw)",
          opacity: 0.72,
          // sits in the dark rather than on top of it
          filter: "brightness(0.82) contrast(1.05) drop-shadow(0 10px 26px rgba(0,0,0,0.8))",
        }}
      />

      {/* swell — three ranks, slowest at the back */}
      <div className="absolute inset-x-0 bottom-0 h-[34vh] overflow-hidden">
        {[
          { fill: "#0E0B07", dur: 46, y: 0, o: 1 },
          { fill: "#120E09", dur: 34, y: 26, o: 1 },
          { fill: "#171009", dur: 24, y: 54, o: 1 },
        ].map((w, n) => (
          <svg
            key={n}
            className="absolute bottom-0 left-0 h-full w-[200%]"
            viewBox="0 0 2880 320"
            preserveAspectRatio="none"
            style={{
              transform: `translateY(${w.y}px)`,
              opacity: w.o,
              animation: reduce ? undefined : `swell ${w.dur}s linear infinite`,
            }}
          >
            <path
              fill={w.fill}
              d={
                n === 0
                  ? "M0,150 C240,110 480,190 720,150 C960,110 1200,190 1440,150 C1680,110 1920,190 2160,150 C2400,110 2640,190 2880,150 L2880,320 L0,320 Z"
                  : n === 1
                    ? "M0,180 C300,140 600,220 900,180 C1200,140 1500,220 1800,180 C2100,140 2400,220 2880,180 L2880,320 L0,320 Z"
                    : "M0,215 C360,180 720,250 1080,215 C1440,180 1800,250 2160,215 C2520,180 2760,240 2880,218 L2880,320 L0,320 Z"
              }
            />
          </svg>
        ))}
        {/* foam catching the lantern */}
        <svg
          className="absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          style={{
            transform: "translateY(54px)",
            animation: reduce ? undefined : "swell 24s linear infinite",
          }}
        >
          <path
            fill="none"
            stroke="rgba(201,146,43,0.16)"
            strokeWidth="1.5"
            d="M0,215 C360,180 720,250 1080,215 C1440,180 1800,250 2160,215 C2520,180 2760,240 2880,218"
          />
        </svg>
      </div>

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 8%, transparent 28%, rgba(8,6,5,0.6) 76%, rgba(8,6,5,0.92) 100%)",
        }}
      />
    </div>
  );
}
