import "server-only";
import { db } from "@/server/db";
import { holdExpiry } from "@/lib/booking-time";

/**
 * Stall holds — the no-double-book core (project.md §7.7, BUSINESS-RULES §2.2).
 * Hold = atomic compare-and-set on Stall.status (a single Postgres UPDATE), so only one concurrent
 * caller can flip AVAILABLE→HELD. The `Booking` row + payment are created on commit (next slice).
 */

export class StallUnavailableError extends Error {
  constructor() {
    super("STALL_UNAVAILABLE");
    this.name = "StallUnavailableError";
  }
}

/** Atomically lock an AVAILABLE stall for this user. Throws if it isn't free. */
export async function holdStall(_userId: string, stallId: string): Promise<{ status: "HELD"; holdUntil: Date }> {
  const holdUntil = holdExpiry();
  const res = await db.stall.updateMany({
    where: { id: stallId, status: "AVAILABLE" },
    data: { status: "HELD", holdUntil },
  });
  if (res.count === 0) throw new StallUnavailableError();
  return { status: "HELD", holdUntil };
}

/** Release a held stall back to AVAILABLE (deselect). No-op if it isn't HELD. */
export async function releaseStall(_userId: string, stallId: string): Promise<void> {
  await db.stall.updateMany({
    where: { id: stallId, status: "HELD" },
    data: { status: "AVAILABLE", holdUntil: null },
  });
}

/** Free expired holds (cron). Returns how many were released. */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
  const res = await db.stall.updateMany({
    where: { status: "HELD", holdUntil: { lt: now } },
    data: { status: "AVAILABLE", holdUntil: null },
  });
  return res.count;
}
