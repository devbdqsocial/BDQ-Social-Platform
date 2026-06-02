/** Pure hold-timing helpers (BUSINESS-RULES §2.2). Kept DB-free so it's unit-testable. */

export const HOLD_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function holdExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + HOLD_TTL_MS);
}

export function isHoldExpired(holdUntil: Date | null | undefined, now: Date = new Date()): boolean {
  return !holdUntil || holdUntil.getTime() <= now.getTime();
}
