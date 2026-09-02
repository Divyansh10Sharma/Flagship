import { daysBetween } from "./date";

/** Always recomputed from the full list of played dates — never an
 *  incrementing counter. That is what makes the guest→account merge correct. */
export function computeStreak(playedDates: string[], today: string): number {
  const dates = [...new Set(playedDates)].sort().reverse();
  if (!dates.length) return 0;

  const gap = daysBetween(dates[0], today);
  // The run must reach today or yesterday, otherwise it is already broken.
  if (gap > 1 || gap < 0) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i], dates[i - 1]) === 1) streak++;
    else break;
  }
  return streak;
}

export function longestStreak(playedDates: string[]): number {
  const dates = [...new Set(playedDates)].sort();
  if (!dates.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) run++;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}
