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
      <h2 className="fell text-[40px] leading-none text-chalk sm:text-[48px]">
        Crew roster
      </h2>
      <div className="rope mt-4" />

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
        {state === "loading" && (
          <p className="fell text-[18px]" style={{ color: "var(--muted)" }}>Reading the roster…</p>
        )}

        {state === "unreachable" && (
          <p className="fell text-[18px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Can't reach the roster right now. Your own scores are safe on this device.
          </p>
        )}

        {state === "ready" && rows && rows.length === 0 && (
          <p className="fell text-[18px]" style={{ color: "var(--muted)" }}>
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
                  className="parchment flex items-center gap-3 p-3.5"
                  style={
                    me
                      ? { boxShadow: "0 0 0 2px var(--brass), 0 18px 36px -22px rgba(0,0,0,0.95)" }
                      : undefined
                  }
                >
                  <span
                    className="fell tabular flex h-9 w-9 shrink-0 items-center justify-center text-[17px]"
                    style={
                      i < 3
                        ? {
                            color: "#2b1d08",
                            background:
                              i === 0 ? "#C9922B" : i === 1 ? "#B9AE97" : "#A9754A",
                            border: "1px solid rgba(60,44,20,0.5)",
                          }
                        : {
                            color: "var(--sepia-soft)",
                            border: "1px solid rgba(90,70,45,0.35)",
                          }
                    }
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="fell truncate text-[20px]" style={{ color: "var(--sepia)" }}>
                      {r.username}
                      {me && (
                        <span
                          className="ledger ml-2"
                          style={{ color: "#8a5f1d" }}
                        >
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-[13px]" style={{ color: "var(--sepia-soft)" }}>{r.sub}</p>
                  </div>
                  <span className="fell tabular shrink-0 text-[24px]" style={{ color: "#8a5f1d" }}>{r.score}</span>
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
