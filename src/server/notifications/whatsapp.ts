import "server-only";
import { db } from "@/server/db";
import { whatsAppConfigured, sendWhatsApp } from "@/lib/whatsapp";
import { buildTicketWhatsApp } from "@/lib/whatsapp-template";

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
