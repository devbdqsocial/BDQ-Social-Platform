import "server-only";
import { db } from "@/server/db";
import { resendConfigured } from "@/lib/resend";

/** Read-only Communication overview: provider config + outbox queue health. Reuses the Outbox table. */

/** Light PII masking for the failures list (admins don't need the full address to triage). */
function mask(contact: string): string {
  if (contact.includes("@")) {
    const [u, d] = contact.split("@");
    return `${u.slice(0, 2)}***@${d}`;
  }
  return contact.length > 4 ? `***${contact.slice(-4)}` : "***";
}

export async function communicationOverview() {
  const provider = process.env.WHATSAPP_PROVIDER;
  const whatsappConfigured =
    provider === "cloud"
      ? !!process.env.WHATSAPP_CLOUD_TOKEN && !!process.env.WHATSAPP_CLOUD_PHONE_ID
      : provider === "interakt"
        ? !!process.env.INTERAKT_API_KEY
        : false;

  const [grouped, lastSent, failures] = await Promise.all([
    db.outbox.groupBy({ by: ["status"], _count: { _all: true } }),
    db.outbox.findFirst({ where: { status: "SENT" }, orderBy: { sentAt: "desc" }, select: { sentAt: true } }),
    db.outbox.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { channel: true, toAddress: true, template: true, lastError: true, attempts: true, createdAt: true },
    }),
  ]);
  const count = (s: "QUEUED" | "SENT" | "FAILED") => grouped.find((g) => g.status === s)?._count._all ?? 0;

  return {
    email: { configured: resendConfigured() },
    whatsapp: { provider: provider ?? null, configured: whatsappConfigured },
    queue: { queued: count("QUEUED"), sent: count("SENT"), failed: count("FAILED") },
    lastSentAt: lastSent?.sentAt ? lastSent.sentAt.toISOString() : null,
    recentFailures: failures.map((f) => ({
      channel: f.channel,
      to: mask(f.toAddress),
      template: f.template,
      error: f.lastError,
      attempts: f.attempts,
      at: f.createdAt.toISOString(),
    })),
  };
}
