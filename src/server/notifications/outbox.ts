import "server-only";
import { db } from "@/server/db";
import { resendConfigured, sendEmail } from "@/lib/resend";
import { whatsAppConfigured, sendWhatsAppText } from "@/lib/whatsapp";
import { channelsFor } from "@/lib/notify-channels";
import { buildReminderEmail, buildTicketEmail, buildFinanceDigestEmail } from "@/server/notifications/email";
import { sendTicketWhatsApp, sendWaitlistWhatsApp } from "@/server/notifications/whatsapp";
import { bumpCampaignStat } from "@/server/campaigns/stats";
import { campaignEmailHtml } from "@/lib/email-template";
import { unsubscribeUrl } from "@/lib/unsubscribe-token";

/** Inter-send pause for bulk campaign messages, to stay under provider rate limits. */
const CAMPAIGN_THROTTLE_MS = 60;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/**
 * Single durable processor for ALL outbox templates (ticket / reminder / finance-digest /
 * CAMPAIGN_MESSAGE). Skips items whose campaign is PAUSED/CANCELLED. Campaign delivered/failed stats
 * are bumped atomically; a campaign flips to COMPLETED once its queue fully drains.
 */
export async function processOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const rows = await db.outbox.findMany({
    where: {
      AND: [
        { OR: [{ status: "QUEUED" }, { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } }] },
        { OR: [{ campaignId: null }, { campaign: { status: { notIn: ["PAUSED", "CANCELLED"] } } }] },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  const touchedCampaigns = new Set<string>();

  for (const row of rows) {
    const payload =
      (row.payload as { orderId?: string; eventId?: string; subject?: string; body?: string } | null) ?? {};
    if (row.campaignId) touchedCampaigns.add(row.campaignId);
    try {
      if (row.template === "reminder") {
        if (row.channel === "EMAIL" && payload.eventId) {
          const email = await buildReminderEmail(payload.eventId);
          if (email) await sendEmail({ to: row.toAddress, subject: email.subject, html: email.html });
        }
      } else if (row.template === "finance-digest") {
        if (row.channel === "EMAIL" && payload.eventId) {
          const email = await buildFinanceDigestEmail(payload.eventId);
          if (email) await sendEmail({ to: row.toAddress, subject: email.subject, html: email.html });
        }
      } else if (row.template === "CAMPAIGN_MESSAGE") {
        if (row.channel === "EMAIL") {
          await sendEmail({
            to: row.toAddress,
            subject: payload.subject || "(no subject)",
            html: campaignEmailHtml({ body: payload.body || "", unsubscribeUrl: unsubscribeUrl(row.toAddress) }),
            tags: row.campaignId ? [{ name: "campaign_id", value: row.campaignId }] : undefined,
          });
        } else if (row.channel === "WHATSAPP") {
          await sendWhatsAppText(row.toAddress, payload.body || "");
        }
        if (row.campaignId) await bumpCampaignStat(row.campaignId, "delivered");
        await sleep(CAMPAIGN_THROTTLE_MS);
      } else if (row.template === "waitlist") {
        if (row.channel === "WHATSAPP") await sendWaitlistWhatsApp(row.toAddress);
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
      const terminal = row.attempts + 1 >= MAX_ATTEMPTS;
      await db.outbox.update({
        where: { id: row.id },
        data: { status: "FAILED", attempts: { increment: 1 }, lastError: (e instanceof Error ? e.message : "error").slice(0, 300) },
      });
      if (row.campaignId && terminal) await bumpCampaignStat(row.campaignId, "failed");
      failed++;
    }
  }

  // A campaign is done once nothing is left to send/retry for it.
  for (const cid of touchedCampaigns) {
    const remaining = await db.outbox.count({
      where: { campaignId: cid, OR: [{ status: "QUEUED" }, { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } }] },
    });
    if (remaining === 0) {
      await db.campaign.updateMany({ where: { id: cid, status: { in: ["SCHEDULED", "PROCESSING"] } }, data: { status: "COMPLETED" } });
    }
  }

  return { sent, failed };
}
