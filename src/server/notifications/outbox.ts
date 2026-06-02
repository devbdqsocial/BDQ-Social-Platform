import "server-only";
import { db } from "@/server/db";
import { resendConfigured, sendEmail } from "@/lib/resend";
import { whatsAppConfigured } from "@/lib/whatsapp";
import { channelsFor } from "@/lib/notify-channels";
import { buildReminderEmail, buildTicketEmail } from "@/server/notifications/email";
import { sendTicketWhatsApp } from "@/server/notifications/whatsapp";

/**
 * Durable, retryable, multi-channel delivery (ARCHITECTURE §17). Fulfilment enqueues; a processor
 * (called inline + by cron) drains the queue. Only configured channels are enqueued, so WhatsApp
 * stays dormant until INTERAKT_API_KEY is set.
 */

const MAX_ATTEMPTS = 5;

export async function enqueueTicketNotifications(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { email: true, phone: true } } },
  });
  if (!order) return;

  const channels = channelsFor({
    email: order.user.email,
    phone: order.user.phone,
    emailOn: resendConfigured(),
    waOn: whatsAppConfigured(),
  });

  for (const channel of channels) {
    const toAddress = channel === "EMAIL" ? order.user.email! : order.user.phone!;
    await db.outbox.upsert({
      where: { dedupeKey: `order:${orderId}:${channel}` },
      update: {},
      create: { channel, toAddress, template: "ticket", payload: { orderId }, dedupeKey: `order:${orderId}:${channel}` },
    });
  }
}

export async function processOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const rows = await db.outbox.findMany({
    where: { OR: [{ status: "QUEUED" }, { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } }] },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const payload = (row.payload as { orderId?: string; eventId?: string } | null) ?? {};
    try {
      if (row.template === "reminder") {
        if (row.channel === "EMAIL" && payload.eventId) {
          const email = await buildReminderEmail(payload.eventId);
          if (email) await sendEmail({ to: row.toAddress, subject: email.subject, html: email.html });
        }
      } else {
        if (!payload.orderId) throw new Error("missing orderId");
        if (row.channel === "EMAIL") {
          const email = await buildTicketEmail(payload.orderId);
          if (email) await sendEmail({ to: row.toAddress, subject: email.subject, html: email.html, attachments: email.attachments });
        } else if (row.channel === "WHATSAPP") {
          await sendTicketWhatsApp(payload.orderId, row.toAddress);
        }
      }
      await db.outbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });
      sent++;
    } catch (e) {
      await db.outbox.update({
        where: { id: row.id },
        data: { status: "FAILED", attempts: { increment: 1 }, lastError: (e instanceof Error ? e.message : "error").slice(0, 300) },
      });
      failed++;
    }
  }
  return { sent, failed };
}
