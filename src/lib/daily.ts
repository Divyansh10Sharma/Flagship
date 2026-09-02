import { byTier } from "./countries";

/** FNV-1a, uint32. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Snapshotted once at module load; the pools are sorted by code in the data
// file, so the same seed picks the same country on every device.
const POOLS = [byTier(1), byTier(2), byTier(3)];

/** Three country codes for a date: tier 1, then 2, then 3. Difficulty ramps. */
export function getDailyRounds(dateKey: string): string[] {
  const rand = mulberry32(hashString(dateKey));
  return POOLS.map((pool) => pool[Math.floor(rand() * pool.length)].code);
}
