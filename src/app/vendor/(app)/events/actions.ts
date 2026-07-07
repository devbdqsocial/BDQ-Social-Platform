"use server";

import { requireVendor } from "@/server/auth/guard";
import { db } from "@/server/db";
import { joinWaitlist } from "@/server/waitlist/service";

/** Join the STALL waitlist for a sold-out market. If a stall frees up, it's held for the
 * first vendor in line for 24h (offerStallsToWaitlist). */
export async function joinStallWaitlistAction(eventId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireVendor();
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { email: true, phone: true } });
  const contact = user?.email ?? user?.phone;
  if (!contact) return { ok: false, error: "Add a contact to your account first" };
  const event = await db.event.findUnique({ where: { id: eventId }, select: { vendorStallsEnabled: true } });
  if (!event?.vendorStallsEnabled) return { ok: false, error: "This event doesn't take vendor stalls" };
  await joinWaitlist({ eventId, type: "STALL", contact, userId: session.userId });
  return { ok: true };
}
