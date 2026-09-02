import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { COUNTRIES } from "../lib/countries";
import { prettyDate } from "../lib/date";
import { multiplierFor } from "../lib/scoring";

type Props = {
  today: string;
  todayCodes: string[];
  streak: number;
  lifetime: number;
  playedToday: boolean;
  onPlay: () => void;
  onLeaderboard: () => void;
};

export default function Home({
  today,
  todayCodes,
  streak,
  lifetime,
  playedToday,
  onPlay,
  onLeaderboard,
}: Props) {
  const reduce = useReducedMotion();

  // Never show today's own flags in the hero — that would hand over the answers.
  const hero = useMemo(() => {
    const exclude = new Set(todayCodes);
    const pool = COUNTRIES.filter((c) => !exclude.has(c.code));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }, [todayCodes]);

  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % hero.length), 2500);
    return () => clearInterval(id);
  }, [hero.length, reduce]);

  const current = hero[i];
  // The streak the player would be on if they finish today.
  const prospective = playedToday ? streak : streak + 1;
  const multiplier = multiplierFor(prospective);

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.32, delay, ease: "easeOut" as const },
        };

  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <motion.div {...rise(0.06)} className="relative h-[180px] w-full sm:h-[220px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={current.code}
            src={current.flagSvg}
            alt=""
            aria-hidden="true"
            draggable={false}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.9 }}
            className="absolute inset-0 m-auto h-full w-auto max-w-full rounded-[6px] border border-edge object-contain"
          />
        </AnimatePresence>
      </motion.div>

      <motion.h1
        {...rise(0.12)}
        className="expanded mt-7 text-[40px] leading-none text-chalk sm:text-[52px]"
      >
        Flagship
      </motion.h1>

      <motion.button
        {...rise(0.18)}
        type="button"
        onClick={onPlay}
        className="mt-7 h-14 w-full rounded-[10px] bg-chalk px-6 text-[17px] font-medium text-slate"
      >
        {playedToday ? "See today's results" : "Play today"}
      </motion.button>

      <motion.div
        {...rise(0.24)}
        className="mt-8 w-full rounded-[14px] border border-edge bg-raise p-5 text-left"
      >
        <p className="text-[15px] text-muted">{prettyDate(today)}</p>

        <div className="mt-4 flex items-baseline justify-between gap-4">
          <span className="text-[15px] text-muted">Streak</span>
          <span className="tabular text-[15px] text-chalk">
            {streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "None yet"}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-4">
          <span className="text-[15px] text-muted">
            {playedToday ? "Multiplier today" : "Multiplier if you play"}
          </span>
          <span className="tabular text-[15px] text-gold">{multiplier}&times;</span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-4">
          <span className="text-[15px] text-muted">Lifetime points</span>
          <span className="tabular text-[15px] text-chalk">{lifetime}</span>
        </div>

        {streak === 0 && (
          <p className="mt-4 text-[15px] text-muted">Play today to start a streak.</p>
        )}
      </motion.div>

      <motion.button
        {...rise(0.3)}
        type="button"
        onClick={onLeaderboard}
        className="mt-3 h-12 w-full rounded-[10px] border border-edge px-4 text-[15px] text-muted"
      >
        Leaderboard
      </motion.button>
    </div>
  );
}
