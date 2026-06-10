import "server-only";
import { Prisma } from "@prisma/client";
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
export async function holdStall(userId: string, stallId: string): Promise<{ status: "HELD"; holdUntil: Date }> {
  const holdUntil = holdExpiry();
  const res = await db.stall.updateMany({
    where: { id: stallId, status: "AVAILABLE" },
    data: { status: "HELD", holdUntil, holdUserId: userId },
  });
  if (res.count === 0) throw new StallUnavailableError();
  return { status: "HELD", holdUntil };
}

/** Release a held stall back to AVAILABLE (deselect). No-op unless this user owns the hold. */
export async function releaseStall(userId: string, stallId: string): Promise<void> {
  await db.stall.updateMany({
    where: { id: stallId, status: "HELD", holdUserId: userId },
    data: { status: "AVAILABLE", holdUntil: null, holdUserId: null },
  });
}

/** Free expired holds (cron). Returns how many were released. */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
  const res = await db.stall.updateMany({
    where: { status: "HELD", holdUntil: { lt: now } },
    data: { status: "AVAILABLE", holdUntil: null, holdUserId: null },
  });
  return res.count;
}

/**
 * Reserve a stall for a vendor during onboarding — a long-lived hold (no payment yet, no TTL) that
 * lasts while the application is open. Atomic compare-and-set on Stall.status (AVAILABLE→HELD)
 * serialises against double-reservation. Creates a Booking(RESERVED).
 */
export async function reserveStall(vendorProfileId: string, userId: string, eventId: string, stallId: string) {
  try {
    return await db.$transaction(async (tx) => {
      const held = await tx.stall.updateMany({
        where: { id: stallId, status: "AVAILABLE", kind: "STALL" },
        data: { status: "HELD", holdUserId: userId, holdUntil: null },
      });
      if (held.count === 0) throw new StallUnavailableError();
      return tx.booking.create({
        data: { eventId, stallId, vendorProfileId, source: "VENDOR", status: "RESERVED" },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new StallUnavailableError();
    throw e;
  }
}

/** Cancel a vendor's own RESERVED / PENDING_PAYMENT booking and free the stall. */
export async function cancelReservation(vendorProfileId: string, bookingId: string): Promise<void> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, stallId: true, vendorProfileId: true, status: true },
  });
  if (!b || b.vendorProfileId !== vendorProfileId) return;
  if (b.status !== "RESERVED" && b.status !== "PENDING_PAYMENT") return;
  await db.$transaction([
    db.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } }),
    db.stall.updateMany({ where: { id: b.stallId, status: "HELD" }, data: { status: "AVAILABLE", holdUntil: null, holdUserId: null } }),
  ]);
}

/** Free PENDING_PAYMENT bookings whose 48h pay window lapsed (cron). Returns how many released. */
export async function releaseExpiredPayWindows(now: Date = new Date()): Promise<number> {
  const expired = await db.booking.findMany({
    where: { status: "PENDING_PAYMENT", payBy: { lt: now } },
    select: { id: true, stallId: true },
  });
  for (const b of expired) {
    await db.$transaction([
      db.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } }),
      db.stall.updateMany({ where: { id: b.stallId, status: "HELD" }, data: { status: "AVAILABLE", holdUntil: null, holdUserId: null } }),
    ]);
  }
  return expired.length;
}
