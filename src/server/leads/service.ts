import "server-only";
import { db } from "@/server/db";

/** Lead capture at a vendor's stall (scan QR → consented contact). */

export async function captureLead(input: {
  vendorProfileId: string;
  eventId: string;
  name?: string;
  phone?: string;
  email?: string;
  consent?: boolean;
}) {
  return db.lead.create({
    data: {
      vendorProfileId: input.vendorProfileId,
      eventId: input.eventId,
      name: input.name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      consent: input.consent ?? true,
    },
  });
}

export function listLeads(vendorProfileId: string) {
  return db.lead.findMany({ where: { vendorProfileId }, orderBy: { createdAt: "desc" } });
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
