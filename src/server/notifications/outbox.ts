import "server-only";
import { db } from "@/server/db";
import { emailConfigured, sendEmail } from "@/lib/sendgrid";
import { assertWhatsAppSent, sendWhatsApp, sendWhatsAppText, whatsAppCampaignThrottleMs, whatsAppConfigured, whatsAppProvider } from "@/lib/whatsapp";
import { channelsFor } from "@/lib/notify-channels";
import { buildReminderEmail, buildTicketEmail, buildFinanceDigestEmail, buildVendorEmail } from "@/server/notifications/email";
import { sendTicketWhatsApp, sendVendorWhatsApp, sendWaitlistWhatsApp } from "@/server/notifications/whatsapp";
import type { VendorNotifTemplate } from "@/lib/notify-channels";
import { bumpCampaignStat } from "@/server/campaigns/stats";
import { campaignEmailHtml, waitlistEmailHtml } from "@/lib/email-template";
import { unsubscribeUrl } from "@/lib/unsubscribe-token";

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
    emailOn: await emailConfigured(),
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
      (row.payload as {
        orderId?: string;
        eventId?: string;
        vendorProfileId?: string;
        bookingId?: string;
        subject?: string;
        body?: string;
        whatsappTemplateName?: string;
        whatsappTemplateLang?: string;
        whatsappTemplateParams?: string[];
      } | null) ?? {};
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
          if (whatsAppProvider() === "openwa") {
            if (!payload.body?.trim()) throw new Error("missing WhatsApp campaign body");
            assertWhatsAppSent(await sendWhatsAppText(row.toAddress, payload.body));
          } else {
            if (!payload.whatsappTemplateName) throw new Error("missing WhatsApp campaign template");
            assertWhatsAppSent(await sendWhatsApp({
              phone: row.toAddress,
              template: payload.whatsappTemplateName,
              lang: payload.whatsappTemplateLang,
              params: Array.isArray(payload.whatsappTemplateParams) ? payload.whatsappTemplateParams : [],
            }));
          }
        }
        if (row.campaignId) await bumpCampaignStat(row.campaignId, "delivered");
        await sleep(whatsAppCampaignThrottleMs());
      } else if (row.template === "waitlist") {
        if (row.channel === "WHATSAPP") assertWhatsAppSent(await sendWaitlistWhatsApp(row.toAddress));
      } else if (row.template === "stall-waitlist-offer") {
        // A freed stall is being held for this vendor for 24h (waitlist right-of-first-refusal).
        if (row.channel === "EMAIL" && payload.eventId) {
          const ev = await db.event.findUnique({ where: { id: payload.eventId }, select: { name: true } });
          if (ev) {
            await sendEmail({
              to: row.toAddress,
              subject: `A stall opened up - ${ev.name}`,
              html: waitlistEmailHtml({
                eventName: ev.name,
                url: `https://vendors.${process.env.APP_BASE_DOMAIN ?? "bdqsocial.com"}/events/${payload.eventId}`,
              }),
            });
          }
        } else if (row.channel === "WHATSAPP") {
          assertWhatsAppSent(await sendWaitlistWhatsApp(row.toAddress));
        }
      } else if (row.template.startsWith("vendor-")) {
        // Vendor lifecycle templates need an explicit branch — the final else assumes tickets.
        if (row.channel === "EMAIL") {
          const email = await buildVendorEmail(row.template as VendorNotifTemplate, payload);
          if (email) await sendEmail({ to: row.toAddress, subject: email.subject, html: email.html });
        } else if (row.channel === "WHATSAPP") {
          assertWhatsAppSent(await sendVendorWhatsApp(row.template as VendorNotifTemplate, row.toAddress, payload));
        }
      } else {
        if (!payload.orderId) throw new Error("missing orderId");
        if (row.channel === "EMAIL") {
          const email = await buildTicketEmail(payload.orderId);
          if (email) await sendEmail({ to: row.toAddress, subject: email.subject, html: email.html, attachments: email.attachments });
        } else if (row.channel === "WHATSAPP") {
          assertWhatsAppSent(await sendTicketWhatsApp(payload.orderId, row.toAddress));
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
