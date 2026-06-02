import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Admin-side vendor review + approval → stall assignment (creates the Booking). */

export function listVendors() {
  return db.vendorProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { phone: true, email: true } },
      _count: { select: { bookings: true } },
    },
  });
}

export function getVendor(id: string) {
  return db.vendorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { phone: true, email: true } },
      kyc: true,
      contract: true,
      assets: { orderBy: { createdAt: "desc" } },
      bookings: { include: { stall: { select: { label: true } }, event: { select: { name: true } } } },
    },
  });
}

export class ContractNotSignedError extends Error {
  constructor() {
    super("CONTRACT_NOT_SIGNED");
    this.name = "ContractNotSignedError";
  }
}

/** Stalls that can still be assigned (not already booked/blocked). */
export function listAssignableStalls() {
  return db.stall.findMany({
    where: { kind: "STALL", status: { in: ["AVAILABLE", "HELD"] } },
    include: { event: { select: { name: true } } },
    orderBy: [{ eventId: "asc" }, { label: "asc" }],
  });
}

export function setUnderReview(session: Session, id: string) {
  return withAudit(session, { action: "UPDATE", entity: "VendorProfile", entityId: id }, async () => {
    const before = await db.vendorProfile.findUnique({ where: { id }, select: { approvalStatus: true } });
    return {
      before,
      run: async () => {
        const v = await db.vendorProfile.update({ where: { id }, data: { approvalStatus: "UNDER_REVIEW" } });
        return { result: v, after: { approvalStatus: v.approvalStatus } };
      },
    };
  });
}

export class StallAlreadyBookedError extends Error {
  constructor() {
    super("STALL_ALREADY_BOOKED");
    this.name = "StallAlreadyBookedError";
  }
}

/** Approve a vendor and assign a stall — creates the Booking (BOOKED) atomically. */
export function approveVendor(session: Session, vendorProfileId: string, stallId: string) {
  return withAudit(
    session,
    { action: "APPROVE", entity: "VendorProfile", entityId: vendorProfileId },
    async () => {
      const before = await db.vendorProfile.findUnique({
        where: { id: vendorProfileId },
        select: { approvalStatus: true },
      });
      return {
        before,
        run: async () => {
          const contract = await db.vendorContract.findUnique({ where: { vendorProfileId }, select: { status: true } });
          if (contract?.status !== "SIGNED") throw new ContractNotSignedError();
          try {
            const booking = await db.$transaction(async (tx) => {
              const stall = await tx.stall.findUnique({ where: { id: stallId } });
              if (!stall) throw new Error("Stall not found");
              // reuse the vendor's existing (paid/held) booking if present; else create one.
              // partial-unique index enforces one active booking per stall.
              const existing = await tx.booking.findFirst({
                where: { stallId, vendorProfileId, status: { in: ["HELD", "PENDING"] } },
              });
              const b = existing
                ? await tx.booking.update({ where: { id: existing.id }, data: { status: "BOOKED" } })
                : await tx.booking.create({
                    data: { eventId: stall.eventId, stallId, vendorProfileId, source: "VENDOR", status: "BOOKED" },
                  });
              await tx.stall.update({ where: { id: stallId }, data: { status: "BOOKED", holdUntil: null } });
              await tx.vendorProfile.update({
                where: { id: vendorProfileId },
                data: { approvalStatus: "APPROVED", verifiedCallById: session.userId, verifiedAt: new Date() },
              });
              return b;
            });
            return { result: booking, after: { approvalStatus: "APPROVED", stallId } };
          } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
              throw new StallAlreadyBookedError();
            }
            throw e;
          }
        },
      };
    },
  );
}

export function rejectVendor(session: Session, id: string) {
  return withAudit(session, { action: "REJECT", entity: "VendorProfile", entityId: id }, async () => {
    const before = await db.vendorProfile.findUnique({ where: { id }, select: { approvalStatus: true } });
    return {
      before,
      run: async () => {
        const v = await db.vendorProfile.update({ where: { id }, data: { approvalStatus: "REJECTED" } });
        return { result: v, after: { approvalStatus: v.approvalStatus } };
      },
    };
  });
}
