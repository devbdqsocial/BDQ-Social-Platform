import "server-only";
import { db } from "@/server/db";

/** Lead capture at a vendor's stall (scan QR → consented contact). */

/** A lead may only be captured for an existing, APPROVED vendor (blocks injection to arbitrary ids). */
export async function isLeadVendorValid(vendorProfileId: string): Promise<boolean> {
  const v = await db.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: { approvalStatus: true },
  });
  return v?.approvalStatus === "APPROVED";
}

export async function captureLead(input: {
  vendorProfileId: string;
  eventId: string;
  name?: string;
  phone?: string;
  email?: string;
  consent?: boolean;
}) {
  // Attribute the lead to the vendor's booking for this event (per-stall reporting); null if none.
  const booking = await db.booking.findFirst({
    where: { vendorProfileId: input.vendorProfileId, eventId: input.eventId, status: "BOOKED" },
    select: { id: true },
  });
  return db.lead.create({
    data: {
      vendorProfileId: input.vendorProfileId,
      eventId: input.eventId,
      bookingId: booking?.id ?? null,
      name: input.name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      consent: input.consent ?? true,
    },
  });
}

export function listLeads(vendorProfileId: string, skip = 0, take = 1000) {
  return db.lead.findMany({ where: { vendorProfileId }, orderBy: { createdAt: "desc" }, skip, take });
}

export function getLeadVendor(vendorProfileId: string) {
  return db.vendorProfile.findUnique({ where: { id: vendorProfileId }, select: { brandName: true } });
}

/** The event a lead capture belongs to — the soonest upcoming published/live event. */
export async function currentLeadEventId(): Promise<string | null> {
  const event = await db.event.findFirst({
    where: { status: { in: ["PUBLISHED", "LIVE"] } },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });
  return event?.id ?? null;
}
