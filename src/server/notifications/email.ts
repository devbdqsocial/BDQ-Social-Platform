import "server-only";
import QRCode from "qrcode";
import { db } from "@/server/db";
import type { EmailAttachment } from "@/lib/resend";
import { ticketEmailHtml, ticketEmailSubject } from "@/lib/email-template";
import { getEventPnl } from "@/server/finance/pnl";
import { formatPaise } from "@/lib/utils";

export interface BuiltEmail {
  subject: string;
  html: string;
  attachments: EmailAttachment[];
}

/** Build the ticket email (subject/html + QR attachments) for an order. Null if nothing to send. */
export async function buildTicketEmail(orderId: string): Promise<BuiltEmail | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: { select: { name: true, location: true, startsAt: true } },
      tickets: { include: { ticketType: { select: { name: true } } } },
    },
  });
  if (!order || order.tickets.length === 0) return null;

  const when = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(order.event.startsAt);

  const attachments = await Promise.all(
    order.tickets.map(async (t, i) => ({
      filename: `ticket-${i + 1}.png`,
      content: await QRCode.toBuffer(t.qrToken, { width: 320, margin: 1 }),
    })),
  );

  return {
    subject: ticketEmailSubject(order.event.name),
    html: ticketEmailHtml({
      eventName: order.event.name,
      when,
      location: order.event.location,
      tickets: order.tickets.map((t) => ({ type: t.ticketType.name, ref: t.id.slice(0, 8) })),
    }),
    attachments,
  };
}

/** Build a finance digest email (P&L snapshot) for an event. Null if the event is gone. */
export async function buildFinanceDigestEmail(eventId: string): Promise<BuiltEmail | null> {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { name: true } });
  if (!event) return null;
  const p = await getEventPnl(eventId);
  const row = (l: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0">${l}</td><td style="padding:4px 0;text-align:right;font-weight:600">${v}</td></tr>`;

  return {
    subject: `Finance digest — ${event.name}`,
    html: `<div style="font-family:sans-serif;max-width:520px"><h2>${event.name} — P&L snapshot</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row("Net revenue", formatPaise(p.netRevenue))}
${row("Gateway fees", `−${formatPaise(p.totalFees)}`)}
${row("Expenses", `−${formatPaise(p.expensesTotal)}`)}
${row("Net profit", formatPaise(p.netProfit))}
${row("Margin", `${(p.marginPct * 100).toFixed(1)}%`)}
${row("ROI", p.roiPct == null ? "—" : `${(p.roiPct * 100).toFixed(1)}%`)}
</table>
<p style="font-size:12px;color:#666">Revenue is net of Razorpay fees. Open the console for the full breakdown.</p></div>`,
    attachments: [],
  };
}

/** Build an event-reminder email (no QR) for the reminders cron. Null if the event is gone. */
export async function buildReminderEmail(eventId: string): Promise<BuiltEmail | null> {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { name: true, location: true, startsAt: true } });
  if (!event) return null;

  const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(event.startsAt);
  const ticketsUrl = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/tickets`;

  return {
    subject: `See you soon — ${event.name}`,
    html: `<div style="font-family:sans-serif;max-width:480px"><h2>${event.name} is almost here</h2>
<p><strong>${when}</strong>${event.location ? ` · ${event.location}` : ""}</p>
<p>Have your QR ticket ready at the gate.</p>
<p><a href="${ticketsUrl}" style="display:inline-block;background:#01065B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View my tickets</a></p></div>`,
    attachments: [],
  };
}
