import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fetchBoard, type Board, type Row } from "../lib/leaderboard";
import { Anchor } from "./icons";

/** Struck metal for the top three, a plain scribed square below that. The
 *  number rides on top as live text — the plates are generated with empty
 *  centres precisely so the rank is not baked into the artwork. */
function RankPlate({ index }: { index: number }) {
  const plate = ["/ranks/gold.webp", "/ranks/silver.webp", "/ranks/bronze.webp"][index];
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center">
      {plate ? (
        <img
          src={plate}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full select-none"
        />
      ) : (
        <span
          className="absolute inset-1"
          style={{ border: "1px solid rgba(90,70,45,0.4)" }}
        />
      )}
      <span
        className="figures relative text-[20px] leading-none"
        style={{
          color: plate ? "#241704" : "var(--ink-deep)",
          fontWeight: 700,
          textShadow: plate ? "0 1px 0 rgba(255,235,180,0.4)" : undefined,
        }}
      >
        {index + 1}
      </span>
    </span>
  );
}

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

      {/* Real hemp with a knot tied at its centre, stretched across the column.
          Not tiled: the knot is centred in the artwork by construction, and
          repeating a rope tile would have to place it separately. */}
      <img
        src="/rope-sheet.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="full-bleed mt-4 block select-none"
      />

      {/* One rivetted plank holding three segments, rather than three separate
          buttons — the frame belongs to the strip, not to each tab. */}
      <div
        className="plank-frame mt-5 flex"
        role="tablist"
        aria-label="Leaderboard"
      >
        {TABS.map((t) => {
          const on = board === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setBoard(t.id)}
              className={`ledger relative h-10 flex-1 ${on ? "tab-on" : ""}`}
              style={{
                color: on ? "#f0dcae" : "var(--muted)",
                textShadow: on ? "0 1px 2px rgba(0,0,0,0.7)" : undefined,
              }}
            >
              {t.label}
              {/* Gold rule struck along the foot of the live segment — the cue
                  the design uses to mark which board is showing. */}
              {on && (
                <span
                  className="pointer-events-none absolute inset-x-1 bottom-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, var(--brass) 25%, #f3d68f 50%, var(--brass) 75%, transparent)",
                  }}
                />
              )}
            </button>
          );
        })}
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
          <ol className="space-y-3">
            {rows.map((r, i) => {
              const me = r.userId === userId;
              return (
                <motion.li
                  key={r.userId}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: reduce ? 0 : Math.min(i, 12) * 0.02 }}
                  className="row-plaque relative flex items-center gap-3.5"
                  // drop-shadow rather than a box-shadow ring: the plaque's
                  // edge is deckled, and a rectangular outline would float
                  // clear of it at every corner.
                  style={
                    me
                      ? {
                          filter:
                            "drop-shadow(0 0 5px rgba(201,146,43,0.9)) drop-shadow(0 10px 16px rgba(0,0,0,0.7))",
                        }
                      : undefined
                  }
                >
                  {/* Crossed sabres pressed faintly into the paper. Line art at
                      low opacity, so the names always win. */}
                  <img
                    src="/sabres.webp"
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-auto -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.13]"
                  />

                  <RankPlate index={i} />

                  <div className="relative min-w-0 flex-1">
                    <p
                      className="display pressed truncate text-[20px] leading-tight"
                      style={{ color: "var(--ink-deep)", fontWeight: 700 }}
                    >
                      {r.username}
                      {me && (
                        <span className="ledger ml-2" style={{ color: "#6b4711" }}>
                          you
                        </span>
                      )}
                    </p>
                    <p
                      className="figures pressed mt-0.5 text-[15px]"
                      style={{ color: "var(--ink)", fontWeight: 500 }}
                    >
                      {r.sub}
                    </p>
                  </div>

                  <span
                    className="figures pressed relative shrink-0 text-[28px] leading-none"
                    style={{ color: "#6b4711", fontWeight: 700 }}
                  >
                    {r.score}
                  </span>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        type="button"
        onClick={onHome}
        className="plank-frame ledger mt-6 flex h-11 w-full items-center justify-center gap-2.5"
        style={{ color: "var(--brass)" }}
      >
        <Anchor size={20} />
        Back to home
      </button>

      {/* The ship stands off below the roster, masked into the dark rather than
          cut off by it — a hard bottom edge would read as a pasted cutout. */}
      <div className="pointer-events-none mt-8 flex justify-center" aria-hidden="true">
        <img
          src="/galleon.webp"
          alt=""
          draggable={false}
          className="w-full max-w-[380px] select-none"
          style={{
            // The artwork has bright cream sails, which at any readable opacity
            // makes the ship the loudest thing on the screen. Knocking the
            // brightness down first, then holding it at low opacity, sinks it
            // into the chart the way an engraving printed on the page would sit
            // — present, but never competing with the roster above it.
            opacity: 0.3,
            filter: "brightness(0.62) sepia(0.35) contrast(1.1)",
            maskImage: "linear-gradient(180deg, #000 45%, transparent 92%)",
            WebkitMaskImage: "linear-gradient(180deg, #000 45%, transparent 92%)",
          }}
        />
      </div>
    </div>
  );
}
