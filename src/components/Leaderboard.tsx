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
      <h2 className="expanded text-[32px] leading-none sm:text-[40px]">
        Leaderboard
      </h2>

      <div className="mt-5 flex gap-2" role="tablist" aria-label="Leaderboard">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={board === t.id}
            onClick={() => setBoard(t.id)}
            className={`btn h-11 flex-1 text-[15px] ${
              board === t.id ? "btn-accent" : "btn-ghost text-muted"
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
                  className="surface flex items-center gap-3 p-3.5"
                  style={
                    me
                      ? { borderColor: "var(--brass)" }
                      : undefined
                  }
                >
                  <span
                    className="tabular flex h-8 w-8 shrink-0 items-center justify-center text-[14px]"
                    style={
                      i < 3
                        ? {
                            color: "var(--void)",
                            fontWeight: 600,
                            background:
                              i === 0
                                ? "var(--brass)"
                                : i === 1
                                  ? "var(--bone)"
                                  : "var(--sea)",
                          }
                        : {
                            color: "var(--muted)",
                            border: "1px solid var(--edge)",
                          }
                    }
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] text-chalk">
                      {r.username}
                      {me && (
                        <span
                          className="label ml-2"
                          style={{ color: "var(--brass)" }}
                        >
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-[13px] text-muted">{r.sub}</p>
                  </div>
                  <span className="tabular shrink-0 text-[18px] text-brass">{r.score}</span>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        type="button"
        onClick={onHome}
        className="btn btn-ghost mt-6 h-12 w-full text-[15px] text-muted"
      >
        Back to home
      </button>
    </div>
  );
}
