import "server-only";
import { db } from "@/server/db";
import { assertWhatsAppSent, whatsAppConfigured, whatsAppProvider, sendWhatsApp, sendWhatsAppImage, sendWhatsAppText, type WhatsAppSendResult } from "@/lib/whatsapp";
import { buildTicketWhatsApp, buildVendorWhatsApp, buildWaitlistWhatsApp, type VendorWhatsAppData } from "@/lib/whatsapp-template";
import type { VendorNotifTemplate } from "@/lib/notify-channels";
import { fmtDateTime } from "@/lib/date-formats";
import { openWaTicketQrEnabled } from "@/lib/openwa";
import { toQrBuffer } from "@/lib/qr-token";

/**
 * Send the ticket confirmation over WhatsApp. OpenWA also receives generated QR PNG media.
 */
export async function sendTicketWhatsApp(orderId: string, toPhone: string): Promise<WhatsAppSendResult> {
  if (!whatsAppConfigured()) return { skipped: true };
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: { select: { name: true } },
      tickets: { select: { id: true, qrToken: true } },
      _count: { select: { tickets: true } },
    },
  });
  if (!order) return { skipped: true };

  const ticketsUrl = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/tickets`;
  const sent = await sendWhatsApp({
    phone: toPhone,
    template: process.env.WHATSAPP_TEMPLATE_TICKET || process.env.INTERAKT_TEMPLATE_TICKET || "ticket_confirmation",
    params: buildTicketWhatsApp({ eventName: order.event.name, ticketCount: order._count.tickets, ticketsUrl }),
  });
  if ("skipped" in sent) return sent;

  if (whatsAppProvider() === "openwa" && openWaTicketQrEnabled()) {
    for (const [i, ticket] of order.tickets.entries()) {
      const media = await sendWhatsAppImage({
        phone: toPhone,
        buffer: await toQrBuffer(ticket.qrToken),
        filename: `bdq-ticket-${ticket.id}.png`,
        caption: `BDQ ticket ${i + 1} QR - ${order.event.name}`,
      });
      assertWhatsAppSent(media);
    }
  }

  return sent;
}

const VENDOR_WA_TEMPLATE_ENV: Record<VendorNotifTemplate, string> = {
  "vendor-application": "WHATSAPP_TEMPLATE_VENDOR_APPLICATION",
  "vendor-approved": "WHATSAPP_TEMPLATE_VENDOR_APPROVED",
  "vendor-rejected": "WHATSAPP_TEMPLATE_VENDOR_REJECTED",
  "vendor-booking-confirmed": "WHATSAPP_TEMPLATE_VENDOR_BOOKED",
  "vendor-event-reminder": "WHATSAPP_TEMPLATE_VENDOR_REMINDER",
  "vendor-loadin-reminder": "WHATSAPP_TEMPLATE_VENDOR_LOADIN",
};

/**
 * Cloud/interakt providers need a pre-approved template per message type; openwa sends free text.
 * Used by the enqueue helper so WHATSAPP rows are only created when they can actually deliver
 * (avoids dead retry loops until templates are approved).
 */
export function vendorWhatsAppReady(template: VendorNotifTemplate): boolean {
  if (!whatsAppConfigured()) return false;
  return whatsAppProvider() === "openwa" || !!process.env[VENDOR_WA_TEMPLATE_ENV[template]];
}

/** Send a vendor lifecycle message over WhatsApp. No-op until a provider is configured. */
export async function sendVendorWhatsApp(
  template: VendorNotifTemplate,
  toPhone: string,
  payload: { vendorProfileId?: string; bookingId?: string },
): Promise<WhatsAppSendResult> {
  if (!whatsAppConfigured()) return { skipped: true };
  const portalUrl = `https://vendors.${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/home`;

  let data: VendorWhatsAppData | null = null;
  if (payload.bookingId) {
    const booking = await db.booking.findUnique({
      where: { id: payload.bookingId },
      include: {
        stall: { select: { label: true } },
        event: { select: { name: true, loadInStartsAt: true, loadInEndsAt: true } },
        vendorProfile: { select: { brandName: true } },
      },
    });
    if (booking?.vendorProfile) {
      data = {
        brandName: booking.vendorProfile.brandName,
        stallLabel: booking.stall.label,
        eventName: booking.event.name,
        payBy: booking.payBy ? fmtDateTime(booking.payBy) : undefined,
        loadIn: booking.event.loadInStartsAt
          ? `${fmtDateTime(booking.event.loadInStartsAt)}${booking.event.loadInEndsAt ? ` - ${fmtDateTime(booking.event.loadInEndsAt)}` : ""}`
          : undefined,
        portalUrl,
      };
    }
  } else if (payload.vendorProfileId) {
    const profile = await db.vendorProfile.findUnique({ where: { id: payload.vendorProfileId }, select: { brandName: true } });
    if (profile) data = { brandName: profile.brandName, portalUrl };
  }
  if (!data) return { skipped: true };

  const { params, text } = buildVendorWhatsApp(template, data);
  if (whatsAppProvider() === "openwa") return sendWhatsAppText(toPhone, text);

  const templateName = process.env[VENDOR_WA_TEMPLATE_ENV[template]];
  if (!templateName) return { skipped: true };
  return sendWhatsApp({ phone: toPhone, template: templateName, params });
}

/**
 * Coming-soon waitlist confirmation over WhatsApp. No-op until a provider is configured. Requires a
 * provider-approved template (WHATSAPP_TEMPLATE_WAITLIST, default "waitlist_confirm") with one body
 * variable {{1}} = the site link.
 */
export async function sendWaitlistWhatsApp(toPhone: string): Promise<WhatsAppSendResult> {
  if (!whatsAppConfigured()) return { skipped: true };
  const url = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}`;
  return sendWhatsApp({
    phone: toPhone,
    template: process.env.WHATSAPP_TEMPLATE_WAITLIST || process.env.INTERAKT_TEMPLATE_WAITLIST || "waitlist_confirm",
    params: buildWaitlistWhatsApp({ url }),
  });
}
