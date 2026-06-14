/**
 * Offer display logic (customer-portal §3.6, R3.9). Pure + DB-free. A published offer shows while
 * live and **greys to "Ended" past `endsAt`** (or when the status is ENDED) — the customer view
 * derives this from time so it's correct even before the admin "auto-end" cron runs.
 */

export type OfferPhase = "upcoming" | "live" | "ended";

export interface OfferTimes {
  startsAt: Date;
  endsAt: Date;
  status: string; // OfferStatus
}

export function offerPhase(o: OfferTimes, now: Date = new Date()): OfferPhase {
  const t = now.getTime();
  if (o.status === "ENDED" || t >= o.endsAt.getTime()) return "ended";
  if (t < o.startsAt.getTime()) return "upcoming";
  return "live";
}

/** Soft redemption cap (no auth in V1) — null means unlimited. */
export const canRedeem = (maxRedemptions: number | null, redeemedCount: number): boolean =>
  maxRedemptions == null || redeemedCount < maxRedemptions;

/** Validity chip text for a live offer ("Tonight only" when it ends today, else a date). */
export function validityLabel(endsAt: Date, now: Date = new Date()): string {
  const sameDay = endsAt.getFullYear() === now.getFullYear() && endsAt.getMonth() === now.getMonth() && endsAt.getDate() === now.getDate();
  return sameDay ? "Tonight only" : `Until ${endsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}
