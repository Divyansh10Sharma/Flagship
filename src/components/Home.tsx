import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { COUNTRIES } from "../lib/countries";
import { prettyDate } from "../lib/date";
import { multiplierFor } from "../lib/scoring";
import WaxSeal from "./WaxSeal";
import { CompassRose, Flame, Ledger, Trophy } from "./icons";

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
function Stat({
  label,
  value,
  icon,
  gold = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  gold?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid rgba(90,70,45,0.22)" }}
    >
      <span className="flex items-center gap-3">
        {icon}
        <span className="ledger pressed" style={{ color: "var(--ink)" }}>
          {label}
        </span>
      </span>
      {/* .figures, not .fell — see the note on .figures in index.css: IM Fell's
          old-style numerals turn a score of 0 into a bullet. */}
      <span
        className="figures pressed text-[27px] leading-none"
        style={{ color: gold ? "#7a5314" : "var(--ink-deep)", fontWeight: 600 }}
      >
        {value}
      </span>
    </div>
  );
}

/** The week as beads on a wire. Seven because that is the span a daily streak
 *  is actually read against — a rail long enough to hold a year would make one
 *  day's progress invisible. */
function DotRail({ filled }: { filled: number }) {
  return (
    <div className="relative mt-3 flex items-center justify-between" aria-hidden="true">
      <span
        className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2"
        style={{ background: "rgba(90,70,45,0.4)" }}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className="relative block rounded-full"
          style={{
            width: 9,
            height: 9,
            background: i < filled ? "#8a5f1d" : "rgba(84,64,38,0.42)",
            /* no halo ring behind the bead: a flat --parch disc would read as
               a sticker against the grain the rest of the sheet has */
            boxShadow: i < filled ? "0 1px 0 rgba(255,252,240,0.55)" : "none",
          }}
        />
      ))}
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
          {/* The plate shrink-wraps the flag rather than filling the box: the
              image sets the height and the width follows its own ratio, so a
              1:2 Qatari flag and a 1:1 Swiss one both get a snug bezel. */}
          <motion.div
            key={current.code}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.9 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flag-plate block h-full">
              <img
                src={current.flagSvg}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="block h-full w-auto max-w-full object-contain"
              />
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.h1
        {...rise(0.14)}
        className="display emboss mt-8 text-[40px] leading-none sm:text-[52px]"
      >
        Flagship
      </motion.h1>

      {/* The mark that closes a chart's title cartouche. */}
      <motion.img
        {...rise(0.18)}
        src="/flourish.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="mt-3 h-auto w-full max-w-[290px] select-none"
      />

      {/* No icons overlaid here: plate.webp has a compass rose struck into
          each end already, and a second one laid on top reads as a sticker. */}
      <motion.div {...rise(0.22)} className="plate-shadow mt-7 w-full">
        <button type="button" onClick={onPlay} className="btn btn-primary h-14 w-full">
          {playedToday ? "See today's results" : "Play"}
        </button>
      </motion.div>

      <motion.div
        {...rise(0.3)}
        className="parchment mt-7 w-full p-3 text-left"
      >
        {/* Pressed across the page's corner, the way a log entry is closed out.
            Sits proud of the sheet on purpose — a seal flush inside the margin
            reads as a printed sticker rather than something pressed on top. */}
        <span className="absolute -right-4 -top-6 z-10 rotate-6">
          <WaxSeal size={58} />
        </span>

        {/* keeps the date clear of the seal, which overhangs the corner */}
        <div className="flex items-center justify-between gap-3 pr-12">
          <p className="ledger pressed flex items-center gap-2.5" style={{ color: "var(--ink)" }}>
            <Ledger size={30} />
            Ship's log
          </p>
          <p className="fell text-[16px] italic" style={{ color: "var(--ink)" }}>
            {prettyDate(today)}
          </p>
        </div>

        <DotRail filled={Math.min(streak, 7)} />

        <div className="mt-2">
          <Stat
            icon={<Flame size={30} />}
            label="Streak"
            value={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "None yet"}
          />
          <Stat
            icon={<CompassRose size={30} />}
            label={playedToday ? "Multiplier today" : "Multiplier if you play"}
            value={`${multiplier}×`}
            gold
          />
          <Stat
            icon={<Trophy size={30} />}
            label="Lifetime points"
            value={String(lifetime)}
          />
        </div>

        {streak === 0 && (
          <p className="fell mt-4 text-[16px]" style={{ color: "var(--ink)" }}>
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
