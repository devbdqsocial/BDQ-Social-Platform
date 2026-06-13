import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { resendConfigured, sendEmail } from "@/lib/resend";
import type { Session } from "@/server/auth/guard";

/** "Notify me" waitlist — capture demand when sold out, notify when availability returns. */

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

function waitlistHtml(eventName: string, url: string): string {
  return `<div style="font-family:sans-serif;max-width:480px"><h2>Good news — tickets are available</h2>
<p>A spot just opened up for <strong>${eventName}</strong>. Grab yours before they're gone.</p>
<p><a href="${url}" style="display:inline-block;background:#01065B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Get tickets</a></p></div>`;
}

/** Email un-notified waitlisters that tickets are available, then mark them notified. Audited. */
export function notifyWaitlist(session: Session, eventId: string) {
  return withAudit(session, { action: "NOTIFY", entity: "Waitlist", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const event = await db.event.findUnique({ where: { id: eventId }, select: { name: true, slug: true } });
      const pending = await db.waitlist.findMany({ where: { eventId, source: "EVENT", notifiedAt: null } });
      const url = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/events/${event?.slug ?? ""}`;

      let notified = 0;
      for (const w of pending) {
        if (resendConfigured() && w.contact?.includes("@")) {
          try {
            await sendEmail({ to: w.contact, subject: `Tickets available — ${event?.name ?? "Event"}`, html: waitlistHtml(event?.name ?? "Event", url) });
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
