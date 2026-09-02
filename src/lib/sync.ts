import { supabase } from "./supabase";
import { emitSync } from "./syncBus";
import {
  loadStore,
  markSynced,
  mutateStore,
  pendingDates,
  type Store,
} from "./storage";
import type { DayResult } from "./types";

type Row = {
  user_id: string;
  play_date: string;
  base_score: number;
  multiplier: number;
  final_score: number;
  rounds: DayResult["rounds"];
};

const toRow = (userId: string, d: DayResult): Row => ({
  user_id: userId,
  play_date: d.date,
  base_score: d.base,
  multiplier: d.multiplier,
  final_score: d.final,
  rounds: d.rounds,
});

const toDay = (r: Row): DayResult => ({
  date: String(r.play_date).slice(0, 10),
  rounds: Array.isArray(r.rounds) ? r.rounds : [],
  base: Number(r.base_score),
  multiplier: Number(r.multiplier),
  final: Number(r.final_score),
});

/** Union by date; on a collision the higher final score wins. */
export function mergeDays(
  local: Record<string, DayResult>,
  remote: Record<string, DayResult>
): Record<string, DayResult> {
  const out: Record<string, DayResult> = { ...local };
  for (const [date, day] of Object.entries(remote)) {
    const mine = out[date];
    if (!mine || day.final > mine.final) out[date] = day;
  }
  return out;
}

/**
 * Pull the account's days, merge them with what's on this device, push
 * everything the server is missing, and write the merged set back to
 * localStorage. Streak is recomputed from the merged dates by the caller —
 * five guest days followed by a sign-in stay a five-day streak.
 */
export async function syncAll(userId: string): Promise<Store> {
  const before = loadStore();
  if (!supabase) return before;

  emitSync("syncing");
  try {
    const { data, error } = await supabase
      .from("daily_results")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;

    const remote: Record<string, DayResult> = {};
    for (const r of (data ?? []) as Row[]) {
      const d = toDay(r);
      remote[d.date] = d;
    }

    const merged = mergeDays(before.days, remote);

    // Anything the server doesn't have, or has a worse score for, goes up.
    const toPush = Object.values(merged).filter((d) => {
      const r = remote[d.date];
      return !r || r.final !== d.final;
    });

    if (toPush.length) {
      const { error: upErr } = await supabase
        .from("daily_results")
        .upsert(toPush.map((d) => toRow(userId, d)), { onConflict: "user_id,play_date" });
      if (upErr) throw upErr;
    }

    const after = mutateStore((s) => {
      s.days = merged;
      s.syncedDates = [...new Set([...s.syncedDates, ...Object.keys(merged)])];
    });

    emitSync("synced");
    return after;
  } catch {
    emitSync("failed");
    return loadStore();
  }
}

/** Write one finished day up. localStorage has already been written. */
export async function pushDay(userId: string, day: DayResult): Promise<Store> {
  if (!supabase) return loadStore();
  emitSync("syncing");
  try {
    const { error } = await supabase
      .from("daily_results")
      .upsert([toRow(userId, day)], { onConflict: "user_id,play_date" });
    if (error) throw error;
    const s = markSynced([day.date]);
    emitSync("synced");
    return s;
  } catch {
    emitSync("failed");
    return loadStore();
  }
}

/** The whole retry mechanism. Called on load with a session, on sign-in, and
 *  on the window `online` event. No queue library, no backoff. */
export async function flushPending(userId: string): Promise<Store> {
  const store = loadStore();
  const pending = pendingDates(store);
  if (!pending.length || !supabase) return store;

  emitSync("syncing");
  try {
    const rows = pending.map((d) => toRow(userId, store.days[d]));
    const { error } = await supabase
      .from("daily_results")
      .upsert(rows, { onConflict: "user_id,play_date" });
    if (error) throw error;
    const s = markSynced(pending);
    emitSync("synced");
    return s;
  } catch {
    emitSync("failed");
    return loadStore();
  }
}
