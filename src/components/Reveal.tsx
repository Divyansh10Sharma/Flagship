import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import { factFor } from "../lib/facts";
import type { Country } from "../lib/types";

type Props = {
  country: Country;
  solved: boolean;
  points: number;
  isLast: boolean;
  onNext: () => void;
};

export default function Reveal({ country, solved, points, isLast, onNext }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!solved || reduce) return;
    confetti({
      particleCount: 90,
      spread: 74,
      startVelocity: 34,
      origin: { y: 0.4 },
      colors: ["#C9922B", "#E7DCC3", "#9B2F22", "#4E8C5A"],
      disableForReducedMotion: true,
    });
  }, [solved, reduce]);

  const step = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="pt-7">
      <div className="flex items-start justify-between gap-4">
        <motion.h2
          {...step(0.05)}
          className="fell text-[40px] leading-[1.05] text-chalk sm:text-[52px]"
        >
          {country.name}
        </motion.h2>

        {country.coatOfArms && (
          <motion.img
            {...step(0.12)}
            src={country.coatOfArms}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="mt-1 h-16 w-16 shrink-0 object-contain p-1.5 sm:h-20 sm:w-20"
            style={{ background: "var(--parch)", border: "1px solid #6d4a16" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      <motion.p {...step(0.16)} className="fell mt-3 text-[18px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {factFor(country)}
      </motion.p>

      <motion.div {...step(0.22)} className="mt-5">
        {solved ? (
          <span
            className="fell inline-flex items-center gap-2 px-3.5 py-1.5 text-[18px] text-hit"
            style={{ border: "1px solid color-mix(in srgb, var(--hit) 50%, transparent)" }}
          >
            +{points} point{points === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="fell text-[18px]" style={{ color: "var(--muted)" }}>
            It was {country.name}. No points this round.
          </span>
        )}
      </motion.div>

      <motion.button
        {...step(0.3)}
        type="button"
        onClick={onNext}
        className="btn btn-primary mt-7 h-14 w-full text-[17px]"
      >
        {isLast ? "See results" : "Next flag"}
      </motion.button>
    </div>
  );
}
