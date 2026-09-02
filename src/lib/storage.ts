import type { DayResult, InProgress } from "./types";

const KEY = "flagship:v1";
const VERSION = 1;

export type Store = {
  version: number;
  days: Record<string, DayResult>;
  inProgress: InProgress | null;
  syncedDates: string[];
};

export const emptyStore = (): Store => ({
  version: VERSION,
  days: {},
  inProgress: null,
  syncedDates: [],
});

/** Corrupt JSON must reset to empty, never white-screen the app. */
export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyStore();
    if (parsed.version !== VERSION) return emptyStore();
    return {
      version: VERSION,
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
      inProgress: parsed.inProgress ?? null,
      syncedDates: Array.isArray(parsed.syncedDates) ? parsed.syncedDates : [],
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private mode / quota. The game still plays, it just won't resume.
  }
}

export function mutateStore(fn: (s: Store) => void): Store {
  const s = loadStore();
  fn(s);
  saveStore(s);
  return s;
}

export function writeInProgress(ip: InProgress | null): void {
  mutateStore((s) => {
    s.inProgress = ip;
  });
}

/** Finishing a day: write the result, clear the resume state. */
export function writeDay(day: DayResult): Store {
  return mutateStore((s) => {
    s.days[day.date] = day;
    s.inProgress = null;
  });
}

export function markSynced(dates: string[]): Store {
  return mutateStore((s) => {
    s.syncedDates = [...new Set([...s.syncedDates, ...dates])];
  });
}

export function pendingDates(store: Store): string[] {
  const synced = new Set(store.syncedDates);
  return Object.keys(store.days).filter((d) => !synced.has(d)).sort();
}

export const playedDates = (store: Store): string[] => Object.keys(store.days).sort();

export const lifetimePoints = (store: Store): number =>
  Object.values(store.days).reduce((sum, d) => sum + d.final, 0);
