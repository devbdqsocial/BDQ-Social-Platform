import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Marketing campaigns. v1: email blasts to customers (WhatsApp needs approved templates → draft only). */

export interface CampaignInput {
  name: string;
  channel: "EMAIL" | "WHATSAPP";
  audience: "ALL" | "BUYERS";
  subject?: string;
  body?: string;
}

export function listCampaigns() {
  return db.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

export function createCampaign(session: Session, input: CampaignInput) {
  return withAudit(session, { action: "CREATE", entity: "Campaign" }, async () => ({
    before: null,
    run: async () => {
      const c = await db.campaign.create({
        data: {
          name: input.name,
          channel: input.channel,
          audience: input.audience,
          subject: input.subject || null,
          body: input.body || null,
          createdById: session.userId,
        },
      });
      return { result: c, after: c };
    },
  }));
}

export class CampaignSendError extends Error {
  constructor(msg: string) { super(msg); this.name = "CampaignSendError"; }
}

/** Send an email campaign to its audience (best-effort per recipient). Marks SENT + sentCount. */
export function sendCampaign(session: Session, id: string) {
  return withAudit(session, { action: "SEND", entity: "Campaign", entityId: id }, async () => {
    const before = await db.campaign.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        if (!before) throw new CampaignSendError("Campaign not found");
        if (before.status === "SENT") throw new CampaignSendError("This campaign was already sent");
        if (before.channel !== "EMAIL") throw new CampaignSendError("Only email campaigns can be sent for now");

        const where = before.audience === "BUYERS"
          ? { email: { not: null }, orders: { some: { status: "PAID" as const } } }
          : { role: "CUSTOMER" as const, email: { not: null } };
        const users = await db.user.findMany({ where, select: { email: true }, take: 5000 });

        let sent = 0;
        const { sendEmail, resendConfigured } = await import("@/lib/resend");
        if (resendConfigured()) {
          const subject = before.subject || before.name;
          const html = before.body || "";
          for (const u of users) {
            if (!u.email) continue;
            try { await sendEmail({ to: u.email, subject, html }); sent++; } catch (e) { console.error("campaign send", e); }
          }
        }

        const updated = await db.campaign.update({
          where: { id },
          data: { status: "SENT", sentCount: sent, sentAt: new Date() },
        });
        return { result: updated, after: { status: "SENT", sentCount: sent } };
      },
    };
  });
}
