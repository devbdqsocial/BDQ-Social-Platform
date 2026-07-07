import "server-only";
import { db } from "@/server/db";
import { emailConfigured } from "@/lib/sendgrid";
import { channelsFor, type VendorNotifTemplate } from "@/lib/notify-channels";
import { vendorWhatsAppReady } from "@/server/notifications/whatsapp";
import { processOutbox } from "@/server/notifications/outbox";

/** In-app bell copy per lifecycle template (rendered in the vendor rail). */
const BELL_COPY: Record<VendorNotifTemplate, { title: string; body: string; href: string }> = {
  "vendor-application": { title: "Application received", body: "Our team calls within 48 hours — keep your phone close.", href: "/vendor/home" },
  "vendor-approved": { title: "You're approved!", body: "Complete payment to lock your stall.", href: "/vendor/home" },
  "vendor-rejected": { title: "About your application", body: "It wasn't approved this time — call us and we'll help.", href: "/vendor/home" },
  "vendor-booking-confirmed": { title: "Stall locked", body: "Payment received — see you at the market.", href: "/vendor/home" },
  "vendor-event-reminder": { title: "Market day is close", body: "Check your load-in window and stall details.", href: "/vendor/home" },
  "vendor-loadin-reminder": { title: "Load-in opens soon", body: "Time to set up — the floor team can point you to your stall.", href: "/vendor/home" },
};

/** Best-effort in-app notification for the vendor portal bell. Never throws. Pass a
 * deterministic `id` (e.g. `bell:${dedupeBase}`) to make repeat calls no-ops. */
export async function notifyVendor(
  vendorProfileId: string,
  input: { id?: string; type: string; title: string; body?: string; href?: string },
): Promise<void> {
  try {
    await db.notification.create({ data: { ...input, vendorProfileId } });
  } catch {
    // bell is best-effort (duplicate deterministic id = already delivered)
  }
}

export function listVendorNotifications(vendorProfileId: string, limit = 20) {
  return db.notification.findMany({ where: { vendorProfileId }, orderBy: { createdAt: "desc" }, take: limit });
}

export function vendorUnreadCount(vendorProfileId: string) {
  return db.notification.count({ where: { vendorProfileId, readAt: null } });
}

export async function markVendorNotificationsRead(vendorProfileId: string): Promise<void> {
  await db.notification.updateMany({ where: { vendorProfileId, readAt: null }, data: { readAt: new Date() } });
}

/**
 * Enqueue a vendor lifecycle notification (email + WhatsApp) on the durable outbox
 * (mirrors enqueueTicketNotifications), plus an in-app bell row. Contacts: EMAIL →
 * User.email; WHATSAPP → VendorProfile.whatsapp override, else User.phone (both E.164).
 * Never throws — a notification failure must not break signing/approval/fulfilment.
 */
export async function enqueueVendorNotification(
  vendorProfileId: string,
  template: VendorNotifTemplate,
  payload: { bookingId?: string; eventId?: string },
  dedupeBase: string,
  opts?: { drain?: boolean },
): Promise<void> {
  try {
    const profile = await db.vendorProfile.findUnique({
      where: { id: vendorProfileId },
      select: { whatsapp: true, user: { select: { email: true, phone: true } } },
    });
    if (!profile) return;

    // In-app bell first — it works even when no email/WhatsApp provider is configured.
    const bell = BELL_COPY[template];
    await notifyVendor(vendorProfileId, { id: `bell:${dedupeBase}`, type: template, ...bell });

    const phone = profile.whatsapp ?? profile.user.phone;
    const channels = channelsFor({
      email: profile.user.email,
      phone,
      emailOn: await emailConfigured(),
      waOn: vendorWhatsAppReady(template),
    });

    for (const channel of channels) {
      const toAddress = channel === "EMAIL" ? profile.user.email! : phone!;
      await db.outbox.upsert({
        where: { dedupeKey: `${dedupeBase}:${channel}` },
        update: {},
        create: {
          channel,
          toAddress,
          template,
          payload: { vendorProfileId, ...payload },
          dedupeKey: `${dedupeBase}:${channel}`,
        },
      });
    }
    // Deliver inline (ticket-flow pattern); the notifyRetry cron is the retry net.
    if (channels.length && opts?.drain !== false) await processOutbox(10);
  } catch {
    // swallowed by design — the cron drain picks up whatever was enqueued
  }
}
