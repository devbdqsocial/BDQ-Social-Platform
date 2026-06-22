import { fmtDateTime, fmtDateFull } from "@/lib/date-formats";
import "server-only";
import { db } from "@/server/db";
import type { EmailAttachment } from "@/lib/resend";
import { financeDigestEmailHtml, reminderEmailHtml, ticketEmailHtml, ticketEmailSubject } from "@/lib/email-template";
import { getEventPnl } from "@/server/finance/pnl";
import { formatPaise } from "@/lib/utils";
import { toQrBuffer } from "@/lib/qr-token";

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

  const ticketsUrl = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/tickets`;
  const tickets = order.tickets.map((t, i) => ({
    ticket: t,
    ref: t.id.slice(0, 8),
    cid: `ticket-${i + 1}-${t.id}@bdqsocial`,
  }));

  return {
    subject: ticketEmailSubject(order.event.name),
    html: ticketEmailHtml({
      eventName: order.event.name,
      when: fmtDateTime(order.event.startsAt),
      location: order.event.location,
      tickets: tickets.map(({ ticket, ref, cid }) => ({ type: ticket.ticketType.name, ref, qrCid: cid })),
      ticketsUrl,
    }),
    attachments: await Promise.all(
      tickets.map(async ({ ticket, cid }) => ({
        filename: `${cid}.png`,
        content: await toQrBuffer(ticket.qrToken),
        contentType: "image/png",
        contentId: cid,
      })),
    ),
  };
}

/** Build a finance digest email (P&L snapshot) for an event. Null if the event is gone. */
export async function buildFinanceDigestEmail(eventId: string): Promise<BuiltEmail | null> {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { name: true } });
  if (!event) return null;
  const p = await getEventPnl(eventId);

  return {
    subject: `Finance digest - ${event.name}`,
    html: financeDigestEmailHtml({
      eventName: event.name,
      rows: [
        { label: "Net revenue", value: formatPaise(p.netRevenue), emphasis: true },
        { label: "Gateway fees", value: `-${formatPaise(p.totalFees)}` },
        { label: "Expenses", value: `-${formatPaise(p.expensesTotal)}` },
        { label: "Net profit", value: formatPaise(p.netProfit), emphasis: true },
        { label: "Margin", value: `${(p.marginPct * 100).toFixed(1)}%` },
        { label: "ROI", value: p.roiPct == null ? "-" : `${(p.roiPct * 100).toFixed(1)}%` },
      ],
    }),
    attachments: [],
  };
}

/** Build an event-reminder email (no QR) for the reminders cron. Null if the event is gone. */
export async function buildReminderEmail(eventId: string): Promise<BuiltEmail | null> {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { name: true, location: true, startsAt: true } });
  if (!event) return null;

  const ticketsUrl = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/tickets`;

  return {
    subject: `See you soon - ${event.name}`,
    html: reminderEmailHtml({
      eventName: event.name,
      when: fmtDateFull(event.startsAt),
      location: event.location,
      ticketsUrl,
    }),
    attachments: [],
  };
}
