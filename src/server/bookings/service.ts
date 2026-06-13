import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";

/**
 * Stall reservations — the no-double-book core (project.md §7.7, BUSINESS-RULES §2.2).
 * Atomic compare-and-set on Stall.status (a single Postgres UPDATE), so only one concurrent
 * caller can take a stall; the Booking partial-unique index is the final guarantee.
 * Booking collapse (R1.3): the public 10-min select-to-hold flow is removed — reservations
 * happen only through the vendor flow (RESERVED → PENDING_PAYMENT → BOOKED).
 */

export class StallUnavailableError extends Error {
  constructor() {
    super("STALL_UNAVAILABLE");
    this.name = "StallUnavailableError";
  }
}

/**
 * Free TTL'd stall holds (cron). Nothing creates TTL holds anymore (vendor reservations are
 * open-ended); this sweep keeps tolerating legacy rows until the M2 data migration clears them.
 */
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
