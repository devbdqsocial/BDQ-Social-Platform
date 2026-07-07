import { fmtDateTime, fmtDateFull } from "@/lib/date-formats";
import "server-only";
import { db } from "@/server/db";
import type { EmailAttachment } from "@/lib/sendgrid";
import { financeDigestEmailHtml, reminderEmailHtml, ticketEmailHtml, ticketEmailSubject, vendorEmailHtml, type EmailKeyValueRow } from "@/lib/email-template";
import type { VendorNotifTemplate } from "@/lib/notify-channels";
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

const vendorPortalUrl = () => `https://vendors.${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/home`;

/** Build a vendor lifecycle email. Null if the referenced profile/booking is gone. */
export async function buildVendorEmail(
  template: VendorNotifTemplate,
  payload: { vendorProfileId?: string; bookingId?: string },
): Promise<BuiltEmail | null> {
  const portal = vendorPortalUrl();

  if (template === "vendor-application" || template === "vendor-rejected") {
    if (!payload.vendorProfileId) return null;
    const profile = await db.vendorProfile.findUnique({
      where: { id: payload.vendorProfileId },
      select: { brandName: true },
    });
    if (!profile) return null;
    if (template === "vendor-application") {
      return {
        subject: "Application received - BDQ Social",
        html: vendorEmailHtml({
          preheader: "We got your vendor application",
          eyebrow: "Vendor application",
          title: "You're in review",
          intro: profile.brandName,
          message: "Our team calls within 48 hours - keep your phone close.",
          note: "Nothing else is needed from you. Payment unlocks once we approve you.",
          ctaLabel: "Open vendor portal",
          ctaUrl: portal,
        }),
        attachments: [],
      };
    }
    return {
      subject: "About your BDQ Social application",
      html: vendorEmailHtml({
        preheader: "An update on your vendor application",
        eyebrow: "Vendor application",
        title: "Let's talk",
        intro: profile.brandName,
        message: "This application wasn't approved this time.",
        note: "Call us and we'll help - we want you at the market.",
        ctaLabel: "Open vendor portal",
        ctaUrl: portal,
      }),
      attachments: [],
    };
  }

  if (!payload.bookingId) return null;
  const booking = await db.booking.findUnique({
    where: { id: payload.bookingId },
    include: {
      stall: { select: { label: true, priceInPaise: true, stallType: { select: { priceInPaise: true } } } },
      event: { select: { name: true, location: true, startsAt: true, loadInStartsAt: true, loadInEndsAt: true } },
      vendorProfile: { select: { brandName: true } },
    },
  });
  if (!booking?.vendorProfile) return null;

  const stall = booking.stall.label;
  const eventName = booking.event.name;
  const fee = booking.stall.priceInPaise ?? booking.stall.stallType?.priceInPaise ?? 0;
  const loadIn = booking.event.loadInStartsAt
    ? `${fmtDateTime(booking.event.loadInStartsAt)}${booking.event.loadInEndsAt ? ` - ${fmtDateTime(booking.event.loadInEndsAt)}` : ""}`
    : null;
  const baseRows: EmailKeyValueRow[] = [
    { label: "Stall", value: stall, emphasis: true },
    { label: "Event", value: eventName },
    ...(loadIn ? [{ label: "Load-in", value: loadIn }] : []),
  ];

  switch (template) {
    case "vendor-approved":
      return {
        subject: `You're approved - lock Stall ${stall}`,
        html: vendorEmailHtml({
          preheader: `Complete payment to lock Stall ${stall}`,
          eyebrow: "Vendor approved",
          title: "You're approved",
          intro: booking.vendorProfile.brandName,
          message: booking.payBy
            ? `Complete payment by ${fmtDateTime(booking.payBy)} to lock Stall ${stall}.`
            : `Complete payment to lock Stall ${stall}.`,
          rows: [...baseRows, { label: "Stall fee", value: formatPaise(fee), emphasis: true }],
          ctaLabel: "Pay & lock my stall",
          ctaUrl: portal,
        }),
        attachments: [],
      };
    case "vendor-booking-confirmed":
      return {
        subject: `Stall ${stall} is yours - ${eventName}`,
        html: vendorEmailHtml({
          preheader: `Payment received - Stall ${stall} is locked`,
          eyebrow: "Booking confirmed",
          title: `Stall ${stall} is yours`,
          intro: booking.vendorProfile.brandName,
          message: "Payment received - see you at the market.",
          note: "Your receipt and event rules are in the portal under Documents.",
          rows: baseRows,
          ctaLabel: "Open vendor portal",
          ctaUrl: portal,
        }),
        attachments: [],
      };
    case "vendor-event-reminder":
      return {
        subject: `See you soon - ${eventName}`,
        html: vendorEmailHtml({
          preheader: `${eventName} is almost here`,
          eyebrow: "Event reminder",
          title: "Market day is close",
          intro: `${eventName} - ${fmtDateFull(booking.event.startsAt)}`,
          message: `Stall ${stall} is waiting for you.`,
          note: loadIn ? `Load-in window: ${loadIn}.` : "Check the portal for load-in timings.",
          rows: baseRows,
          ctaLabel: "Open vendor portal",
          ctaUrl: portal,
        }),
        attachments: [],
      };
    case "vendor-loadin-reminder":
      return {
        subject: `Load-in opens soon - ${eventName}`,
        html: vendorEmailHtml({
          preheader: `Load-in for ${eventName} opens soon`,
          eyebrow: "Load-in reminder",
          title: "Time to set up",
          intro: `${eventName} - Stall ${stall}`,
          message: loadIn ? `Load-in window: ${loadIn}.` : "Load-in opens soon.",
          note: "Bring your own trolley if you have heavy stock; the floor team can point you to your stall.",
          ctaLabel: "Open vendor portal",
          ctaUrl: portal,
        }),
        attachments: [],
      };
    default:
      return null;
  }
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
