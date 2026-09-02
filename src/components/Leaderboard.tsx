import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fetchBoard, type Board, type Row } from "../lib/leaderboard";

type Props = {
  today: string;
  userId: string | null;
  onHome: () => void;
};

const TABS: { id: Board; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "points", label: "All time" },
  { id: "streak", label: "Streaks" },
];

export default function Leaderboard({ today, userId, onHome }: Props) {
  const reduce = useReducedMotion();
  const [board, setBoard] = useState<Board>("today");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unreachable">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetchBoard(board, today).then((r) => {
      if (cancelled) return;
      if (r === null) {
        setState("unreachable");
        setRows(null);
      } else {
        setRows(r);
        setState("ready");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [board, today]);

  return (
    <div className="pt-2">
      <h2 className="expanded text-[30px] leading-none text-chalk sm:text-[36px]">
        Leaderboard
      </h2>

      <div className="mt-5 flex gap-2" role="tablist" aria-label="Leaderboard">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={board === t.id}
            onClick={() => setBoard(t.id)}
            className={`h-11 flex-1 rounded-[10px] border text-[15px] ${
              board === t.id
                ? "border-chalk bg-chalk text-slate"
                : "border-edge text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {state === "loading" && <p className="text-[15px] text-muted">Loading…</p>}

        {state === "unreachable" && (
          <p className="text-[15px] leading-relaxed text-muted">
            Can't reach the leaderboard right now. Your own scores are safe on this
            device.
          </p>
        )}

        {state === "ready" && rows && rows.length === 0 && (
          <p className="text-[15px] text-muted">
            {board === "today"
              ? "Nobody has finished today yet. Be first."
              : "No scores here yet."}
          </p>
        )}

        {state === "ready" && rows && rows.length > 0 && (
          <ol className="space-y-2">
            {rows.map((r, i) => {
              const me = r.userId === userId;
              return (
                <motion.li
                  key={r.userId}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: reduce ? 0 : Math.min(i, 12) * 0.02 }}
                  className={`flex items-center gap-3 rounded-[14px] border p-3.5 ${
                    me ? "border-gold bg-raise" : "border-edge bg-raise"
                  }`}
                >
                  <span className="tabular w-7 shrink-0 text-[15px] text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] text-chalk">
                      {r.username}
                      {me && <span className="ml-2 text-[13px] text-gold">you</span>}
                    </p>
                    <p className="text-[13px] text-muted">{r.sub}</p>
                  </div>
                  <span className="tabular shrink-0 text-[18px] text-gold">{r.score}</span>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        type="button"
        onClick={onHome}
        className="mt-6 h-12 w-full rounded-[10px] border border-edge px-4 text-[15px] text-muted"
      >
        Back to home
      </button>
    </div>
  );
}
