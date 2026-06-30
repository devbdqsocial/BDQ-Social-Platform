import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/**
 * Per-booking (per-event) agreement — the vendor confirms this edition's terms + fee before paying,
 * separate from the one-time global onboarding VendorContract. Payment is gated on SIGNED
 * (server/bookings/payment.ts). One per booking.
 */

const AGREEMENT_VERSION = "v1";

export function getBookingAgreement(bookingId: string) {
  return db.bookingAgreement.findUnique({ where: { bookingId } });
}

export function getOrCreateBookingAgreement(bookingId: string) {
  return db.bookingAgreement.upsert({
    where: { bookingId },
    update: {},
    create: { bookingId, status: "SENT", version: AGREEMENT_VERSION },
  });
}

export function signBookingAgreement(
  session: Session,
  vendorProfileId: string,
  bookingId: string,
  opts?: { signerName?: string; signerIp?: string | null },
) {
  return withAudit(session, { action: "SIGN", entity: "BookingAgreement", entityId: bookingId }, async () => {
    const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { vendorProfileId: true } });
    if (!booking || booking.vendorProfileId !== vendorProfileId) throw new Error("Booking not found");
    const before = await db.bookingAgreement.findUnique({ where: { bookingId }, select: { status: true } });
    const fields = {
      status: "SIGNED" as const,
      signedAt: new Date(),
      signerName: opts?.signerName ?? null,
      signerIp: opts?.signerIp ?? null,
      version: AGREEMENT_VERSION,
    };
    return {
      before,
      run: async () => {
        const a = await db.bookingAgreement.upsert({
          where: { bookingId },
          update: fields,
          create: { bookingId, ...fields },
        });
        return { result: a, after: { status: a.status, signedAt: a.signedAt, signerName: a.signerName } };
      },
    };
  });
}
