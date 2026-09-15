import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import WorldMap from "./WorldMap";
import { BY_CODE, COUNTRIES } from "../lib/countries";
import {
  MAX_POINTS,
  centreOf,
  formatKm,
  loadMapRecord,
  loadWorld,
  measure,
  pointsFor,
  saveMapGame,
  type LngLat,
  type MapRecord,
  type World,
} from "../lib/geo";

export const MAP_ROUNDS = 5;

type Placed = { code: string; guess: LngLat; nearest: LngLat; km: number; points: number };

function pickCodes(n: number): string[] {
  const pool = COUNTRIES.map((c) => c.code);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

export default function MapGame() {
  const reduce = useReducedMotion();
  const [world, setWorld] = useState<World | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [codes, setCodes] = useState(() => pickCodes(MAP_ROUNDS));
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<LngLat | null>(null);
  const [results, setResults] = useState<Placed[]>([]);
  const [record, setRecord] = useState<MapRecord>(loadMapRecord);
  const [finished, setFinished] = useState(false);

  const load = useCallback(() => {
    setLoadError(false);
    loadWorld().then(setWorld, () => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  const code = codes[index];
  const country = BY_CODE[code];
  const current = results[index] ?? null;
  const revealed = current != null;
  const total = results.reduce((s, r) => s + r.points, 0);
  const isLast = index >= codes.length - 1;

  const confirm = useCallback(() => {
    if (!guess || revealed || !world) return;
    const m = measure(guess, code, world);
    const placed: Placed = { code, guess, nearest: m.nearest, km: m.km, points: pointsFor(m.km) };
    setResults((r) => [...r, placed]);
  }, [guess, revealed, world, code]);

  const next = useCallback(() => {
    if (!revealed) return;
    if (isLast) {
      setRecord(saveMapGame(results.reduce((s, r) => s + r.points, 0)));
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setGuess(null);
  }, [revealed, isLast, results]);

  const again = () => {
    setCodes(pickCodes(MAP_ROUNDS));
    setIndex(0);
    setGuess(null);
    setResults([]);
    setFinished(false);
  };

  // Enter locks in the pin, then moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || finished) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (revealed) next();
      else confirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, finished, next, confirm]);

  const answer = useMemo(
    () => (current ? { code: current.code, nearest: current.nearest, centre: centreOf(current.code) } : null),
    [current]
  );

  if (finished) {
    return <MapResults results={results} record={record} onAgain={again} />;
  }

  return (
    <div className="pt-2">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="ledger-num" style={{ color: "var(--muted)" }}>
            Country {index + 1} of {codes.length}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={code}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="display emboss mt-1 truncate text-[28px] leading-tight sm:text-[36px]"
            >
              {country?.name ?? code}
            </motion.h2>
          </AnimatePresence>
        </div>
        <div className="shrink-0 text-right">
          <span className="ledger-num block" style={{ color: "var(--muted)" }}>
            Score
          </span>
          <span className="figures text-[26px] leading-tight" style={{ color: "var(--brass)" }}>
            {total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <WorldMap
          world={world}
          guess={current?.guess ?? guess}
          answer={answer}
          disabled={revealed}
          onPlace={setGuess}
        />
      </div>

      {loadError && (
        <p className="mt-3 text-center text-[14px]" style={{ color: "var(--miss)" }}>
          The chart failed to load.{" "}
          <button type="button" className="underline" onClick={load}>
            Try again
          </button>
        </p>
      )}

      <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="min-h-[48px] flex-1">
          {revealed ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              {country && (
                <img
                  src={country.flagSvg}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-auto rounded-[2px]"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                />
              )}
              <div>
                <p className="figures text-[22px] leading-none" style={{ color: "var(--brass)" }}>
                  +{current.points.toLocaleString()}
                  <span className="text-[14px]" style={{ color: "var(--muted)" }}>
                    {" "}/ {MAX_POINTS.toLocaleString()}
                  </span>
                </p>
                <p className="mt-1 text-[14px]" style={{ color: "var(--chalk)" }}>
                  {current.km === 0 ? "Right on it — dead reckoning." : `${formatKm(current.km)} off`}
                </p>
              </div>
            </motion.div>
          ) : (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              {guess
                ? "Pin dropped. Move it by tapping elsewhere, or lock it in."
                : "Tap the map where you think it is. Drag to pan, pinch or scroll to zoom."}
            </p>
          )}
        </div>

        <div className="plate-shadow sm:w-[240px]">
          {revealed ? (
            <button type="button" onClick={next} className="btn btn-primary h-14 w-full">
              {isLast ? "See results" : "Next country"}
            </button>
          ) : (
            <button
              type="button"
              onClick={confirm}
              disabled={!guess || !world}
              className="btn btn-primary h-14 w-full disabled:opacity-50"
            >
              Drop anchor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MapResults({
  results,
  record,
  onAgain,
}: {
  results: Placed[];
  record: MapRecord;
  onAgain: () => void;
}) {
  const reduce = useReducedMotion();
  const total = results.reduce((s, r) => s + r.points, 0);
  const max = results.length * MAX_POINTS;
  const isBest = total > 0 && total >= record.best;

  return (
    <div className="mx-auto max-w-[560px] pt-2">
      <p className="ledger-num" style={{ color: "var(--muted)" }}>
        Chart mode · {results.length} countries
      </p>
      <p
        className="fell tabular mt-2 text-[72px] leading-none sm:text-[88px]"
        style={{ color: "var(--brass)" }}
      >
        {total.toLocaleString()}
      </p>
      <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
        of {max.toLocaleString()} possible
        {isBest ? " · new personal best" : ` · best ${record.best.toLocaleString()}`}
      </p>

      <div className="parchment mt-6 w-full p-3 text-left">
        {results.map((r, i) => {
          const c = BY_CODE[r.code];
          return (
            <motion.div
              key={r.code}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduce ? 0 : 0.05 * i }}
              className="flex items-center justify-between gap-3 py-3"
              style={{
                borderBottom:
                  i < results.length - 1 ? "1px solid rgba(90,70,45,0.22)" : "none",
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                {c && (
                  <img src={c.flagSvg} alt="" aria-hidden="true" className="h-6 w-auto rounded-[2px]" />
                )}
                <span className="min-w-0">
                  <span className="fell block truncate text-[18px]" style={{ color: "var(--ink-deep)" }}>
                    {c?.name ?? r.code}
                  </span>
                  <span className="block text-[13px]" style={{ color: "var(--ink)" }}>
                    {r.km === 0 ? "Exact" : `${formatKm(r.km)} off`}
                  </span>
                </span>
              </span>
              <span
                className="figures pressed shrink-0 text-[22px]"
                style={{ color: r.points === MAX_POINTS ? "#7a5314" : "var(--ink-deep)", fontWeight: 600 }}
              >
                {r.points.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="plate-shadow mt-6 w-full">
        <button type="button" onClick={onAgain} className="btn btn-primary h-14 w-full">
          Sail again
        </button>
      </div>
      <p className="mt-3 text-center text-[13px]" style={{ color: "var(--muted)" }}>
        {record.games} chart{record.games === 1 ? "" : "s"} sailed
      </p>
    </div>
  );
}
