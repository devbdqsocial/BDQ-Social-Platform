import "server-only";
import { db } from "@/server/db";
import { whatsAppConfigured, sendWhatsApp } from "@/lib/whatsapp";
import { buildTicketWhatsApp, buildWaitlistWhatsApp } from "@/lib/whatsapp-template";

/**
 * Send the ticket confirmation over WhatsApp (Cloud API or Interakt). No-op until a provider is
 * configured. (Delivering the QR as WhatsApp media needs a hosted image — a Cloudinary-upload
 * refinement; for now the message links to the buyer's My Tickets page where the QR lives.)
 */
export async function sendTicketWhatsApp(orderId: string, toPhone: string): Promise<void> {
  if (!whatsAppConfigured()) return;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { event: { select: { name: true } }, _count: { select: { tickets: true } } },
  });
  if (!order) return;

  const ticketsUrl = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/tickets`;
  await sendWhatsApp({
    phone: toPhone,
    template: process.env.WHATSAPP_TEMPLATE_TICKET || process.env.INTERAKT_TEMPLATE_TICKET || "ticket_confirmation",
    params: buildTicketWhatsApp({ eventName: order.event.name, ticketCount: order._count.tickets, ticketsUrl }),
  });
}

/**
 * Coming-soon waitlist confirmation over WhatsApp. No-op until a provider is configured. Requires a
 * provider-approved template (WHATSAPP_TEMPLATE_WAITLIST, default "waitlist_confirm") with one body
 * variable {{1}} = the site link.
 */
export async function sendWaitlistWhatsApp(toPhone: string): Promise<void> {
  if (!whatsAppConfigured()) return;
  const url = `https://${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}`;
  await sendWhatsApp({
    phone: toPhone,
    template: process.env.WHATSAPP_TEMPLATE_WAITLIST || process.env.INTERAKT_TEMPLATE_WAITLIST || "waitlist_confirm",
    params: buildWaitlistWhatsApp({ url }),
  });
}
