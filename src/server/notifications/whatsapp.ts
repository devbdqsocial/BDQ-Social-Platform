import "server-only";
import { db } from "@/server/db";
import { assertWhatsAppSent, whatsAppConfigured, whatsAppProvider, sendWhatsApp, sendWhatsAppImage, type WhatsAppSendResult } from "@/lib/whatsapp";
import { buildTicketWhatsApp, buildWaitlistWhatsApp } from "@/lib/whatsapp-template";
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
