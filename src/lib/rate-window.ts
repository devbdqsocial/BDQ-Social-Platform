/** Pure fixed-window helpers (DB-free, unit-testable). */

export function windowReset(now: Date, windowMs: number): Date {
  return new Date(now.getTime() + windowMs);
}

/** Given current row state, decide the next state + whether the request is allowed. */
export function nextWindow(
  row: { count: number; resetAt: Date } | null,
  now: Date,
  max: number,
  windowMs: number,
): { allowed: boolean; reset: boolean; count: number; resetAt: Date } {
  if (!row || row.resetAt <= now) {
    return { allowed: true, reset: true, count: 1, resetAt: windowReset(now, windowMs) };
  }
  if (row.count >= max) {
    return { allowed: false, reset: false, count: row.count, resetAt: row.resetAt };
  }
  return { allowed: true, reset: false, count: row.count + 1, resetAt: row.resetAt };
}
