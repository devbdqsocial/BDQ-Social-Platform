import "server-only";
import { db } from "@/server/db";
import type { z } from "zod";
import type { vendorOfferSchema } from "@/server/schemas";

/**
 * Vendor self-serve offers. A BOOKED + APPROVED vendor manages promos for the events they're in:
 * create (DRAFT) → publish → end. Capped per event. Customer surfaces show only PUBLISHED
 * (server/content/offers.ts); admin can still moderate via admin-offers.
 */

export const MAX_OFFERS_PER_EVENT = 3;

export type VendorOfferInput = z.infer<typeof vendorOfferSchema>;

/** Events the vendor has a confirmed stall in — the only events they can attach offers to. */
export async function listVendorBookedEvents(vendorProfileId: string) {
  const bookings = await db.booking.findMany({
    where: { vendorProfileId, status: "BOOKED" },
    select: { event: { select: { id: true, name: true, startsAt: true, endsAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  const byId = new Map<string, (typeof bookings)[number]["event"]>();
  for (const b of bookings) byId.set(b.event.id, b.event);
  return [...byId.values()];
}

export function listMyOffers(vendorProfileId: string) {
  return db.offer.findMany({
    where: { vendorProfileId },
    orderBy: [{ status: "asc" }, { endsAt: "asc" }],
    include: { event: { select: { name: true } } },
  });
}

async function ownedOffer(vendorProfileId: string, offerId: string) {
  const o = await db.offer.findUnique({ where: { id: offerId }, select: { vendorProfileId: true, status: true } });
  if (!o || o.vendorProfileId !== vendorProfileId) throw new Error("Offer not found.");
  return o;
}

export async function createVendorOffer(vendorProfileId: string, input: VendorOfferInput) {
  const vendor = await db.vendorProfile.findUnique({ where: { id: vendorProfileId }, select: { approvalStatus: true } });
  if (vendor?.approvalStatus !== "APPROVED") throw new Error("Only approved vendors can create offers.");

  const booking = await db.booking.findFirst({ where: { vendorProfileId, eventId: input.eventId, status: "BOOKED" }, select: { id: true } });
  if (!booking) throw new Error("You can only add offers for an event where your stall is booked.");

  const event = await db.event.findUnique({ where: { id: input.eventId }, select: { startsAt: true, endsAt: true } });
  if (!event) throw new Error("Event not found.");
  if (input.startsAt < event.startsAt || input.endsAt > event.endsAt) throw new Error("The offer window must sit inside the event dates.");

  const active = await db.offer.count({ where: { vendorProfileId, eventId: input.eventId, status: { not: "ENDED" } } });
  if (active >= MAX_OFFERS_PER_EVENT) throw new Error(`You can have up to ${MAX_OFFERS_PER_EVENT} offers per event.`);

  return db.offer.create({
    data: {
      eventId: input.eventId,
      vendorProfileId,
      title: input.title,
      terms: input.terms,
      kind: input.kind,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "DRAFT",
    },
  });
}

export async function publishVendorOffer(vendorProfileId: string, offerId: string) {
  await ownedOffer(vendorProfileId, offerId);
  return db.offer.update({ where: { id: offerId }, data: { status: "PUBLISHED" } });
}

export async function endVendorOffer(vendorProfileId: string, offerId: string) {
  await ownedOffer(vendorProfileId, offerId);
  return db.offer.update({ where: { id: offerId }, data: { status: "ENDED" } });
}

export async function deleteVendorOffer(vendorProfileId: string, offerId: string) {
  const o = await ownedOffer(vendorProfileId, offerId);
  if (o.status === "PUBLISHED") throw new Error("End the offer before deleting it.");
  await db.offer.delete({ where: { id: offerId } });
  return { id: offerId };
}
