import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { resolveBookingContract, bookingTokenContext, makeSnapshot } from "@/server/legal/resolve";
import { mergeSections } from "@/server/legal/tokens";

/**
 * Per-booking (per-event) agreement — the vendor confirms this edition's terms + fee before paying,
 * separate from the one-time global onboarding VendorContract. Payment is gated on SIGNED
 * (server/bookings/payment.ts). One per booking. The agreement text resolves from the admin-managed
 * contract templates (stall type → event default → global default) and the exact merged text is
 * snapshotted at sign time.
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
    const signedAt = new Date();
    const [template, ctx] = await Promise.all([resolveBookingContract(bookingId), bookingTokenContext(bookingId)]);
    const { sections } = mergeSections(template.sections, {
      ...ctx,
      signature: { signerName: opts?.signerName ?? null, signedAt },
      doc: { version: template.version },
    });
    const fields = {
      status: "SIGNED" as const,
      signedAt,
      signerName: opts?.signerName ?? null,
      signerIp: opts?.signerIp ?? null,
      version: `${template.slug}@${template.version}`,
      termsSnapshot: makeSnapshot({ slug: template.slug, version: template.version, title: template.title, sections }),
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
