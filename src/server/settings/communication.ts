import "server-only";
import { db } from "@/server/db";
import { emailConfigured } from "@/lib/sendgrid";
import { assertWhatsAppSent, sendWhatsAppImage, sendWhatsAppText, whatsAppConfigured, whatsAppProvider } from "@/lib/whatsapp";
import { toQrBuffer } from "@/lib/qr-token";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

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
  const provider = whatsAppProvider();

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
    email: { configured: await emailConfigured() },
    whatsapp: { provider, configured: whatsAppConfigured() },
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

export function sendWhatsAppTest(session: Session, input: { phone: string; message: string; sendSampleQr: boolean }) {
  return withAudit(session, { action: "SEND_TEST", entity: "WhatsApp" }, async () => ({
    before: null,
    run: async () => {
      if (!whatsAppConfigured()) throw new Error("WhatsApp is not configured.");
      const text = await sendWhatsAppText(input.phone, input.message);
      assertWhatsAppSent(text);

      let qrId: string | null = null;
      if (input.sendSampleQr) {
        const media = await sendWhatsAppImage({
          phone: input.phone,
          buffer: await toQrBuffer(`BDQ-TEST:${new Date().toISOString()}`),
          filename: "bdq-test-qr.png",
          caption: "BDQ WhatsApp QR test",
        });
        assertWhatsAppSent(media);
        qrId = media.id;
      }

      const result = { textId: text.id, qrId };
      return { result, after: { to: mask(input.phone), ...result } };
    },
  }));
}
