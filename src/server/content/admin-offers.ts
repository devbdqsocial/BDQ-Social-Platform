import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import type { CreateOfferInput, UpdateOfferInput } from "@/server/schemas";

/**
 * Admin offer management (admin-portal §6.1). Workflow: DRAFT → PUBLISHED (audited) → ENDED
 * (auto at endsAt via the cron). Validation: window inside the event window; a vendor link must be
 * APPROVED. Customer surfaces show only PUBLISHED (server/content/offers.ts).
 */

export function listOffersForAdmin(eventId: string) {
  return db.offer.findMany({
    where: { eventId },
    orderBy: [{ status: "asc" }, { endsAt: "asc" }],
    include: { vendorProfile: { select: { brandName: true } }, sponsor: { select: { name: true } } },
  });
}

async function assertValid(input: CreateOfferInput | UpdateOfferInput) {
  const event = await db.event.findUnique({ where: { id: input.eventId }, select: { startsAt: true, endsAt: true } });
  if (!event) throw new Error("Event not found");
  if (input.startsAt < event.startsAt || input.endsAt > event.endsAt) {
    throw new Error("The offer window must sit inside the event window.");
  }
  if (input.vendorProfileId) {
    const v = await db.vendorProfile.findUnique({ where: { id: input.vendorProfileId }, select: { approvalStatus: true } });
    if (!v) throw new Error("Vendor not found");
    if (v.approvalStatus !== "APPROVED") throw new Error("Only approved vendors can have offers.");
  }
}

const data = (i: CreateOfferInput | UpdateOfferInput) => ({
  eventId: i.eventId,
  vendorProfileId: i.vendorProfileId ?? null,
  sponsorId: i.sponsorId ?? null,
  title: i.title,
  terms: i.terms,
  kind: i.kind,
  startsAt: i.startsAt,
  endsAt: i.endsAt,
  maxRedemptions: i.maxRedemptions ?? null,
});

export function createOffer(session: Session, input: CreateOfferInput) {
  return withAudit(session, { action: "CREATE", entity: "Offer" }, async () => ({
    before: null,
    run: async () => {
      await assertValid(input);
      const offer = await db.offer.create({ data: data(input) });
      return { result: offer, after: offer };
    },
  }));
}

export function updateOffer(session: Session, input: UpdateOfferInput) {
  return withAudit(session, { action: "UPDATE", entity: "Offer", entityId: input.id }, async () => {
    const before = await db.offer.findUnique({ where: { id: input.id } });
    return {
      before,
      run: async () => {
        await assertValid(input);
        const offer = await db.offer.update({ where: { id: input.id }, data: data(input) });
        return { result: offer, after: offer };
      },
    };
  });
}

/** DRAFT/ENDED → PUBLISHED (live on the customer surface). */
export function publishOffer(session: Session, id: string) {
  return withAudit(session, { action: "PUBLISH", entity: "Offer", entityId: id }, async () => {
    const before = await db.offer.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const offer = await db.offer.update({ where: { id }, data: { status: "PUBLISHED" } });
        return { result: offer, after: { status: offer.status } };
      },
    };
  });
}

/** PUBLISHED → ENDED (manual "end now"). */
export function endOffer(session: Session, id: string) {
  return withAudit(session, { action: "UPDATE", entity: "Offer", entityId: id }, async () => {
    const before = await db.offer.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const offer = await db.offer.update({ where: { id }, data: { status: "ENDED" } });
        return { result: offer, after: { status: offer.status } };
      },
    };
  });
}

export function deleteOffer(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "Offer", entityId: id }, async () => {
    const before = await db.offer.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.offer.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}

/** Cron task (admin-portal §6.1): auto-END any PUBLISHED offer whose window has closed. */
export async function autoEndDueOffers(): Promise<{ ended: number }> {
  const res = await db.offer.updateMany({
    where: { status: "PUBLISHED", endsAt: { lt: new Date() } },
    data: { status: "ENDED" },
  });
  return { ended: res.count };
}
