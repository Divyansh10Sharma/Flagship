import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import CountryPicker from "./CountryPicker";
import FlagCard from "./FlagCard";
import Reveal from "./Reveal";
import Pennant from "./Pennant";
import { MAX_ATTEMPTS } from "../lib/scoring";
import { useIsDesktop } from "../hooks/useMediaQuery";
import type { Country, RoundResult } from "../lib/types";

type Props = {
  country: Country;
  roundIndex: number;
  total: number;
  phase: "guessing" | "revealed";
  wrongGuesses: string[];
  result: RoundResult | null;
  onGuess: (code: string) => void;
  onNext: () => void;
};

function hintsFor(country: Country, misses: number): string[] {
  const out: string[] = [];
  if (misses >= 1) out.push(`It's in ${country.subregion || country.region}.`);
  if (misses >= 2) {
    out.push(
      country.capital
        ? `The capital starts with "${country.capital[0]}".`
        : `It's ${country.landlocked ? "landlocked" : "on the coast"}.`
    );
  }
  return out;
}

export default function Round({
  country,
  roundIndex,
  total,
  phase,
  wrongGuesses,
  result,
  onGuess,
  onNext,
}: Props) {
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();

  const [shaking, setShaking] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const misses = wrongGuesses.length;
  const prevMisses = useRef(misses);

  // Shake on a new miss, and lock the picker for the length of the shake.
  useEffect(() => {
    if (misses > prevMisses.current && phase === "guessing") {
      setShaking(true);
      const id = setTimeout(() => setShaking(false), 320);
      prevMisses.current = misses;
      return () => clearTimeout(id);
    }
    prevMisses.current = misses;
  }, [misses, phase]);

  // Reset per-round view state when the flag changes.
  useEffect(() => {
    setShaking(false);
    setPickerOpen(false);
    prevMisses.current = wrongGuesses.length;
  }, [country.code]);

  // With the sheet up, the flag has to be in the visible top of the viewport.
  useEffect(() => {
    if (pickerOpen && !isDesktop) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pickerOpen, isDesktop]);

  const revealed = phase === "revealed";
  const hints = hintsFor(country, misses);
  // Nothing between here and the picker may carry a transform: a transformed
  // ancestor becomes the containing block for the sheet's position: fixed and
  // drags it off the viewport. The flag shrinking is what keeps it in view.
  const shrink = pickerOpen && !isDesktop;

  return (
    <div className="relative pt-2">
      {/* The one bold move: the flag's own colours flood the screen on reveal. */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            key="flood"
            initial={reduce ? { opacity: 0.3 } : { opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.5 }}
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
            aria-hidden="true"
          >
            <img
              src={country.flagSvg}
              alt=""
              className="h-full w-full object-cover"
              style={{ transform: "scale(1.8)", filter: "blur(80px) saturate(120%)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4">
        <span
          className="label tabular"
        >
          Flag {roundIndex + 1} of {total}
        </span>

        <div
          className="flex items-center gap-1.5"
          aria-label={`${misses} of ${MAX_ATTEMPTS} attempts used`}
        >
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
            const spent = i < misses;
            return (
              <motion.span
                key={i}
                data-dot="true"
                data-spent={spent}
                animate={reduce ? {} : { y: spent ? [0, -3, 0] : 0 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="inline-flex"
              >
                <Pennant spent={spent} />
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* Keyed remount rather than AnimatePresence: mode="wait" holds the
          incoming face until the outgoing one finishes, and a re-render landing
          in that window (the picker closing, say) can leave the card blank.
          Changing the key swaps both faces in a single commit instead. */}
      <div className="mt-5" style={{ perspective: 1000 }}>
        <motion.div
          key={revealed ? "back" : "front"}
          initial={reduce ? false : { rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: "easeOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <FlagCard
            src={country.flagSvg}
            alt={revealed ? `Flag of ${country.name}` : "Guess this flag"}
            shrunk={shrink}
            shaking={shaking}
          />

          {revealed && (
            <Reveal
              country={country}
              solved={result?.solved ?? false}
              points={result?.points ?? 0}
              isLast={roundIndex === total - 1}
              onNext={onNext}
            />
          )}
        </motion.div>
      </div>

      {/* Outside the flip on purpose — `perspective` and `preserve-3d` both
          make an element the containing block for position: fixed, which would
          drag the picker's mobile sheet off the viewport. */}
      {!revealed && (
        <div className="mt-6">
          <CountryPicker
            disabledCodes={wrongGuesses}
            onSelect={onGuess}
            onOpenChange={setPickerOpen}
            disabled={shaking}
          />

          <div className="mt-4 space-y-1.5" aria-live="polite">
            <AnimatePresence initial={false}>
              {hints.map((h) => (
                <motion.p
                  key={h}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[15px] text-muted"
                  style={{
                    background: "var(--deep)",
                    borderLeft: "2px solid var(--brass)",
                  }}
                >
                  {h}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
