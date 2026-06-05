import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { decryptKyc } from "@/server/vendors/service";
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

export async function getVendor(id: string) {
  const vendor = await db.vendorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { phone: true, email: true } },
      kyc: true,
      contract: true,
      assets: { orderBy: { createdAt: "desc" } },
      bookings: { include: { stall: { select: { label: true } }, event: { select: { name: true } } } },
    },
  });
  if (vendor?.kyc) vendor.kyc = decryptKyc(vendor.kyc)!;
  return vendor;
}

export class ContractNotSignedError extends Error {
  constructor() {
    super("CONTRACT_NOT_SIGNED");
    this.name = "ContractNotSignedError";
  }
}

export class VendorExistsError extends Error {
  constructor() {
    super("VENDOR_EXISTS");
    this.name = "VendorExistsError";
  }
}

export interface AdminCreateVendorInput {
  phone: string;
  name?: string;
  brandName: string;
  category?: string;
  description?: string;
  website?: string;
  instagram?: string;
}

/** Admin onboards a vendor by phone (no Firebase): upsert the User, create an APPROVED profile. */
export function createVendorByAdmin(session: Session, input: AdminCreateVendorInput) {
  return withAudit(session, { action: "CREATE", entity: "VendorProfile" }, async () => ({
    before: null,
    run: async () => {
      const profile = await db.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
          where: { phone: input.phone },
          include: { vendorProfile: { select: { id: true } } },
        });
        if (existing?.vendorProfile) throw new VendorExistsError();
        const user = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: { role: "VENDOR", name: input.name ?? existing.name },
            })
          : await tx.user.create({ data: { phone: input.phone, name: input.name, role: "VENDOR" } });
        const socials = input.instagram ? { instagram: input.instagram } : Prisma.JsonNull;
        return tx.vendorProfile.create({
          data: {
            userId: user.id,
            brandName: input.brandName,
            category: input.category || null,
            description: input.description || null,
            website: input.website || null,
            socials,
            approvalStatus: "APPROVED",
            verifiedCallById: session.userId,
            verifiedAt: new Date(),
          },
        });
      });
      return { result: profile, after: profile };
    },
  }));
}

/** Admin assigns a stall to a vendor — creates the Booking (source ADMIN), no contract gate. */
export function assignStallByAdmin(session: Session, vendorProfileId: string, stallId: string) {
  return withAudit(session, { action: "UPDATE", entity: "VendorProfile", entityId: vendorProfileId }, async () => {
    const before = await db.booking.count({ where: { vendorProfileId } });
    return {
      before: { bookings: before },
      run: async () => {
        try {
          const booking = await db.$transaction(async (tx) => {
            const stall = await tx.stall.findUnique({ where: { id: stallId } });
            if (!stall) throw new Error("Stall not found");
            const b = await tx.booking.create({
              data: { eventId: stall.eventId, stallId, vendorProfileId, source: "ADMIN", status: "BOOKED" },
            });
            await tx.stall.update({ where: { id: stallId }, data: { status: "BOOKED", holdUntil: null } });
            return b;
          });
          return { result: booking, after: { stallId } };
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            throw new StallAlreadyBookedError();
          }
          throw e;
        }
      },
    };
  });
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
