import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BY_CODE } from "../lib/countries";
import { factFor } from "../lib/facts";
import type { DayResult } from "../lib/types";

type Props = {
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

export default function Results({ day, streak, isGuest, onSignIn, onHome, onLeaderboard }: Props) {
  const reduce = useReducedMotion();
  const shown = useCountUp(day.final, 800, !!reduce);
  const solved = day.rounds.filter((r) => r.solved).length;

  return (
    <div className="pt-2">
      <p className="text-[15px] text-muted">
        {solved} of {day.rounds.length} flags today
      </p>

      <p className="expanded tabular mt-2 text-[64px] leading-none text-gold sm:text-[76px]">
        {shown}
      </p>

      <p className="tabular mt-3 text-[16px] text-muted">
        {day.base} &times; {day.multiplier} = {day.final}
      </p>

      <p className="mt-1 text-[16px] text-muted">
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
              className="flex gap-4 rounded-[14px] border border-edge bg-raise p-4"
            >
              <img
                src={c.flagSvg}
                alt={`Flag of ${c.name}`}
                draggable={false}
                className="h-12 w-[72px] shrink-0 rounded-[6px] border border-edge object-contain"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[17px] font-medium text-chalk">{c.name}</span>
                  <span
                    className={`tabular shrink-0 text-[15px] ${r.solved ? "text-gold" : "text-muted"}`}
                  >
                    {r.points}
                  </span>
                </div>
                <p className="mt-1 text-[14px] leading-snug text-muted">{factFor(c)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isGuest && (
        <div className="mt-6 rounded-[14px] border border-edge bg-raise p-5">
          <p className="text-[15px] leading-relaxed text-muted">
            Your streak is saved on this device. Sign in and it follows you
            everywhere.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="h-12 flex-1 rounded-[10px] bg-chalk px-4 text-[15px] font-medium text-slate"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="h-12 flex-1 rounded-[10px] border border-edge px-4 text-[15px] text-chalk"
            >
              Create account
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onLeaderboard}
          className="h-12 flex-1 rounded-[10px] border border-edge px-4 text-[15px] text-chalk"
        >
          Leaderboard
        </button>
        <button
          type="button"
          onClick={onHome}
          className="h-12 flex-1 rounded-[10px] border border-edge px-4 text-[15px] text-muted"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
