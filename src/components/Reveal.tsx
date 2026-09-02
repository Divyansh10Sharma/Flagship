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
      spread: 70,
      startVelocity: 34,
      origin: { y: 0.4 },
      colors: ["#35D07F", "#F5C542", "#EDEFF3"],
      disableForReducedMotion: true,
    });
  }, [solved, reduce]);

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="expanded text-[34px] leading-[1.05] text-chalk sm:text-[42px]">
          {country.name}
        </h2>

        {country.coatOfArms && (
          <img
            src={country.coatOfArms}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="mt-1 h-16 w-16 shrink-0 rounded-[6px] object-contain sm:h-20 sm:w-20"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      <p className="mt-3 text-[16px] leading-relaxed text-muted">{factFor(country)}</p>

      <p className="mt-5 text-[17px]">
        {solved ? (
          <span className="text-hit">
            +{points} point{points === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-muted">
            It was {country.name}. No points this round.
          </span>
        )}
      </p>

      <motion.button
        type="button"
        onClick={onNext}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.15 }}
        className="mt-7 h-14 w-full rounded-[10px] bg-chalk px-6 text-[17px] font-medium text-slate"
      >
        {isLast ? "See results" : "Next flag"}
      </motion.button>
    </div>
  );
}
