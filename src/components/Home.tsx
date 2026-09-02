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

/* Full class names only — Tailwind scans source statically, so an interpolated
   `text-${tone}` is never generated and the value renders invisible. */
function Stat({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-[15px] text-muted">{label}</span>
      <span className={`tabular text-[15px] ${gold ? "text-gold" : "text-chalk"}`}>{value}</span>
    </div>
  );
}

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
  const prospective = playedToday ? streak : streak + 1;
  const multiplier = multiplierFor(prospective);

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <motion.div
        {...rise(0.06)}
        className="relative h-[190px] w-full sm:h-[230px]"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={`glow-${current.code}`}
            src={current.flagSvg}
            alt=""
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={reduce ? { opacity: 0.4 } : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.9 }}
            className="absolute inset-0 m-auto h-full w-auto max-w-full object-contain"
            style={{ filter: "blur(46px) saturate(160%)", transform: "scale(1.25)" }}
          />
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={current.code}
            src={current.flagSvg}
            alt=""
            aria-hidden="true"
            draggable={false}
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: reduce ? 0 : 0.9 }}
            className="absolute inset-0 m-auto h-full w-auto max-w-full object-contain"
            style={{ border: "1px solid var(--edge)" }}
          />
        </AnimatePresence>
      </motion.div>

      <motion.h1
        {...rise(0.14)}
        className="expanded mt-9 text-[42px] leading-none sm:text-[56px]"
      >
        Flagship
      </motion.h1>

      <motion.button
        {...rise(0.22)}
        type="button"
        onClick={onPlay}
        className="btn btn-primary mt-8 h-14 w-full text-[17px]"
      >
        {playedToday ? "See today's results" : "Play today"}
      </motion.button>

      <motion.div
        {...rise(0.3)}
        className="surface surface-lit mt-6 w-full p-5 text-left"
      >
        <p className="label">{prettyDate(today)}</p>
        <div className="rule mt-3" />

        <div className="mt-2 divide-y divide-edge/70">
          <Stat
            label="Streak"
            value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "None yet"}
          />
          <Stat
            label={playedToday ? "Multiplier today" : "Multiplier if you play"}
            value={`${multiplier}×`}
            gold
          />
          <Stat label="Lifetime points" value={String(lifetime)} />
        </div>

        {streak === 0 && (
          <p className="mt-4 text-[15px] text-muted">Play today to start a streak.</p>
        )}
      </motion.div>

      <motion.button
        {...rise(0.38)}
        type="button"
        onClick={onLeaderboard}
        className="btn btn-ghost mt-3 h-12 w-full text-[15px]"
      >
        Leaderboard
      </motion.button>
    </div>
  );
}
