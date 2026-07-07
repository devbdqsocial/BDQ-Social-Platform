import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { emailConfigured, sendEmail } from "@/lib/sendgrid";
import { whatsAppConfigured } from "@/lib/whatsapp";
import { notifyVendor } from "@/server/notifications/vendor";
import type { Session } from "@/server/auth/guard";
import { waitlistEmailHtml } from "@/lib/email-template";

/** "Notify me" waitlist - capture demand when sold out, notify when availability returns. */

export type WaitlistType = "TICKET" | "STALL";

export async function joinWaitlist(input: { eventId: string; type: WaitlistType; contact: string; userId?: string }) {
  const existing = await db.waitlist.findFirst({
    where: { eventId: input.eventId, type: input.type, contact: input.contact, source: "EVENT" },
  });
  if (existing) return existing;
  return db.waitlist.create({
    data: { eventId: input.eventId, type: input.type, contact: input.contact, userId: input.userId ?? null, source: "EVENT" },
  });
}

export function listWaitlist(eventId: string) {
  return db.waitlist.findMany({ where: { eventId, source: "EVENT" }, orderBy: { createdAt: "desc" } });
}

export const STALL_OFFER_HOLD_HOURS = 24;

/**
 * Right-of-first-refusal stall offers (vendor-portal §waitlist): when stalls free up, hold each
 * for the oldest un-notified STALL-waitlist vendor (Stall HELD, holdUserId = that vendor,
 * holdUntil = +24h) and enqueue an offer notification. reserveStall lets the held-for vendor take
 * over their own hold; if they don't act, releaseExpiredHolds frees the stall and cascades the
 * offer to the next entry. Cron/flow context — no session, so no withAudit (ticket-flow precedent).
 */
export async function offerStallsToWaitlist(eventId: string, stallIds: string[]): Promise<number> {
  if (stallIds.length === 0) return 0;
  const queue = await db.waitlist.findMany({
    where: { eventId, type: "STALL", source: "EVENT", notifiedAt: null, userId: { not: null } },
    orderBy: { createdAt: "asc" },
    take: stallIds.length,
  });
  if (queue.length === 0) return 0;

  const emailOn = await emailConfigured();
  const waOn = whatsAppConfigured();
  const holdUntil = new Date(Date.now() + STALL_OFFER_HOLD_HOURS * 3600 * 1000);
  let offered = 0;

  for (const stallId of stallIds) {
    const entry = queue.shift();
    if (!entry) break;
    // Atomic compare-and-set — if the stall was grabbed meanwhile, keep the entry for the next release.
    const held = await db.stall.updateMany({
      where: { id: stallId, status: "AVAILABLE", kind: "STALL" },
      data: { status: "HELD", holdUserId: entry.userId, holdUntil },
    });
    if (held.count === 0) {
      queue.unshift(entry);
      continue;
    }
    await db.waitlist.update({ where: { id: entry.id }, data: { notifiedAt: new Date() } });
    const heldFor = await db.vendorProfile.findUnique({ where: { userId: entry.userId! }, select: { id: true } });
    if (heldFor) {
      await notifyVendor(heldFor.id, {
        id: `bell:stall-offer:${eventId}:${entry.id}`,
        type: "stall-waitlist-offer",
        title: "A stall opened up",
        body: "It's held for you for 24 hours — reserve it before it goes.",
        href: `/vendor/events/${eventId}`,
      });
    }
    const channel = entry.contact?.includes("@") ? (emailOn ? "EMAIL" : null) : waOn ? "WHATSAPP" : null;
    if (channel && entry.contact) {
      await db.outbox.upsert({
        where: { dedupeKey: `stall-offer:${eventId}:${entry.id}` },
        update: {},
        create: {
          channel,
          toAddress: entry.contact,
          template: "stall-waitlist-offer",
          payload: { eventId, stallId },
          dedupeKey: `stall-offer:${eventId}:${entry.id}`,
        },
      });
    }
    offered++;
  }

  if (offered > 0) {
    const { processOutbox } = await import("@/server/notifications/outbox");
    await processOutbox(10).catch(() => undefined);
  }
  return offered;
}

/** Email un-notified waitlisters that tickets are available, then mark them notified. Audited. */
export function notifyWaitlist(session: Session, eventId: string) {
  return withAudit(session, { action: "NOTIFY", entity: "Waitlist", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const event = await db.event.findUnique({ where: { id: eventId }, select: { name: true, slug: true } });
      const pending = await db.waitlist.findMany({ where: { eventId, source: "EVENT", notifiedAt: null } });
      const eventName = event?.name ?? "Event";
      const url = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/events/${event?.slug ?? ""}`;

      const canEmail = await emailConfigured();
      let notified = 0;
      for (const w of pending) {
        if (canEmail && w.contact?.includes("@")) {
          try {
            await sendEmail({
              to: w.contact,
              subject: `Tickets available - ${eventName}`,
              html: waitlistEmailHtml({ eventName, url }),
            });
          } catch {
            continue; // leave un-notified for a retry
          }
        }
        await db.waitlist.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
        notified++;
      }
      return { result: { notified }, after: { notified } };
    },
  }));
}
