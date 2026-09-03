import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import WaxSeal from "./WaxSeal";
import { BY_CODE } from "../lib/countries";
import { factFor } from "../lib/facts";
import type { DayResult } from "../lib/types";

type Props = {
  liveFacts?: Record<string, { text: string; url: string }>;
  day: DayResult;
  streak: number;
  isGuest: boolean;
  onSignIn: () => void;
  onHome: () => void;
  onLeaderboard: () => void;
};

function useCountUp(target: number, ms: number, skip: boolean) {
  const [n, setN] = useState(skip ? target : 0);
  useEffect(() => {
    if (skip) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease-out cubic, so it lands softly rather than stopping dead
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, skip]);
  return n;
}

export default function Results({
  day,
  streak,
  isGuest,
  onSignIn,
  onHome,
  onLeaderboard,
  liveFacts = {},
}: Props) {
  const reduce = useReducedMotion();
  const shown = useCountUp(day.final, 800, !!reduce);
  const solved = day.rounds.filter((r) => r.solved).length;

  return (
    <div className="pt-2">
      <p className="ledger-num" style={{ color: "var(--muted)" }}>
        {solved} of {day.rounds.length} flags today
      </p>

      <p
        className="fell tabular mt-2 text-[76px] leading-none sm:text-[92px]"
        style={{ color: "var(--brass)" }}
      >
        {shown}
      </p>

      <p className="fell tabular mt-2 text-[19px]" style={{ color: "var(--muted)" }}>
        {day.base} &times; {day.multiplier} = {day.final}
      </p>

      <p className="fell mt-1 text-[18px]" style={{ color: "var(--muted)" }}>
        {streak > 0
          ? `${streak} day streak.`
          : "Play tomorrow to start a streak."}
      </p>

      <div className="mt-8 space-y-3">
        {day.rounds.map((r, i) => {
          const c = BY_CODE[r.code];
          if (!c) return null;
          return (
            <motion.div
              key={r.code}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : 0.35 + i * 0.06 }}
              className="parchment flex gap-4 p-4"
            >
              <img
                src={c.flagSvg}
                alt={`Flag of ${c.name}`}
                draggable={false}
                className="h-12 w-[72px] shrink-0 object-contain"
                style={{ filter: "drop-shadow(0 2px 5px rgba(60,44,20,0.45))" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="fell text-[21px]" style={{ color: "var(--sepia)" }}>{c.name}</span>
                  <span
                    className="fell tabular shrink-0 text-[19px]"
                    style={{ color: r.solved ? "#8a5f1d" : "rgba(90,70,45,0.7)" }}
                  >
                    {r.points}
                  </span>
                </div>
                <p className="mt-1 text-[14px] leading-snug" style={{ color: "var(--sepia-soft)" }}>
                  {liveFacts[c.code]?.text ?? factFor(c)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isGuest && (
        <div className="parchment mt-6 flex gap-4 p-5">
          <WaxSeal size={46} label="F" />
          <div className="min-w-0 flex-1">
          <p className="fell text-[17px] leading-relaxed" style={{ color: "var(--sepia)" }}>
            Your streak is saved on this device. Sign in and it follows you
            everywhere.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="btn btn-accent h-12 flex-1 px-4 text-[15px]"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="btn btn-ghost h-12 flex-1 px-4 text-[15px]"
            >
              Create account
            </button>
          </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onLeaderboard}
          className="btn btn-ghost h-12 flex-1 px-4 text-[15px]"
        >
          Leaderboard
        </button>
        <button
          type="button"
          onClick={onHome}
          className="btn btn-ghost h-12 flex-1 px-4 text-[15px] text-muted"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
