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
    <div
      className="flex items-baseline justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid rgba(90,70,45,0.22)" }}
    >
      <span className="ledger" style={{ color: "var(--sepia-soft)" }}>
        {label}
      </span>
      <span
        className="fell tabular text-[26px] leading-none"
        style={{ color: gold ? "#8a5f1d" : "var(--sepia)" }}
      >
        {value}
      </span>
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

  // Warm the next two flags so the swap never waits on the network.
  useEffect(() => {
    for (const n of [1, 2]) {
      const next = hero[(i + n) % hero.length];
      if (next) new Image().src = next.flagSvg;
    }
  }, [i, hero]);
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

        <AnimatePresence initial={false}>
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
            className="absolute inset-0 h-full w-full object-contain"
            style={{ filter: "drop-shadow(0 22px 44px rgba(0,0,0,0.85))" }}
          />
        </AnimatePresence>
      </motion.div>

      <motion.h1
        {...rise(0.14)}
        className="fell mt-8 text-[54px] leading-none text-chalk sm:text-[68px]"
      >
        Flagship
      </motion.h1>

      <motion.button
        {...rise(0.22)}
        type="button"
        onClick={onPlay}
        className="btn btn-primary mt-7 h-14 w-full"
      >
        {playedToday ? "See today's results" : "Play today"}
      </motion.button>

      <motion.div
        {...rise(0.3)}
        className="parchment mt-7 w-full p-5 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="ledger" style={{ color: "var(--sepia-soft)" }}>
            Ship's log
          </p>
          <p className="fell text-[15px]" style={{ color: "var(--sepia-soft)" }}>
            {prettyDate(today)}
          </p>
        </div>
        <div className="rope mt-3" />

        <div className="mt-2" style={{ borderTop: "1px solid rgba(90,70,45,0.25)" }}>
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
          <p className="fell mt-4 text-[16px]" style={{ color: "var(--sepia-soft)" }}>
            Play today to start a streak.
          </p>
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
