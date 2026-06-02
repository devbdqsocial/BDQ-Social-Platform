/** Pure health classification — testable without a DB. */
export function healthStatus(o: { dbOk: boolean; outboxFailed: number; threshold?: number }): {
  ok: boolean;
  degraded: boolean;
} {
  const threshold = o.threshold ?? 20;
  return { ok: o.dbOk, degraded: !o.dbOk || o.outboxFailed > threshold };
}
