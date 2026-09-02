export const POINTS_BY_ATTEMPT = [5, 3, 1]; // index = attempt number - 1
export const MAX_ATTEMPTS = 3;

export function pointsForAttempt(attempt: number): number {
  return POINTS_BY_ATTEMPT[attempt - 1] ?? 0;
}

/** Streak includes today. */
export function multiplierFor(streak: number): number {
  if (streak >= 30) return 2;
  if (streak >= 14) return 1.75;
  if (streak >= 7) return 1.5;
  if (streak >= 4) return 1.25;
  if (streak >= 2) return 1.1;
  return 1;
}

export function finalScore(base: number, multiplier: number): number {
  return Math.round(base * multiplier);
}
