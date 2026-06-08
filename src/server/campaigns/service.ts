import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { resolveAudience } from "./audience";
import { NotifChannel, Prisma } from "@prisma/client";

export interface CampaignInput {
  name: string;
  channel: NotifChannel;
  audience: string;
  targeting?: unknown;
  subject?: string;
  body?: string;
  customContacts?: unknown;
}

export function listCampaigns() {
  return db.campaign.findMany({ 
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { outboxItems: true } } }
  });
}

export function getCampaign(id: string) {
  return db.campaign.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { outboxItems: true } } }
  });
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
          targeting: (input.targeting as Prisma.InputJsonValue) ?? Prisma.DbNull,
          subject: input.subject || null,
          body: input.body || null,
          customContacts: (input.customContacts as Prisma.InputJsonValue) ?? Prisma.DbNull,
          createdById: session.userId,
          stats: { delivered: 0, opened: 0, clicked: 0, failed: 0 }
        },
      });
      return { result: c, after: c };
    },
  }));
}

export function updateCampaign(session: Session, id: string, input: Partial<CampaignInput>) {
  return withAudit(session, { action: "UPDATE", entity: "Campaign", entityId: id }, async () => {
    const before = await db.campaign.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        const c = await db.campaign.update({
          where: { id },
          data: {
            ...input,
            // ensure JSON fields don't accidentally become undefined (use DbNull for Prisma)
            targeting: input.targeting !== undefined ? (input.targeting as Prisma.InputJsonValue) ?? Prisma.DbNull : undefined,
            customContacts: input.customContacts !== undefined ? (input.customContacts as Prisma.InputJsonValue) ?? Prisma.DbNull : undefined,
          },
        });
        return { result: c, after: c };
      },
    };
  });
}

export class CampaignSendError extends Error {
  constructor(msg: string) { super(msg); this.name = "CampaignSendError"; }
}

/** 
 * Enqueues a campaign: locks it, resolves the audience, and creates Outbox items.
 * A background processor will then read from the Outbox to dispatch.
 */
export function sendCampaign(session: Session, id: string) {
  return withAudit(session, { action: "SEND", entity: "Campaign", entityId: id }, async () => {
    const before = await db.campaign.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        if (!before) throw new CampaignSendError("Campaign not found");
        if (before.status !== "DRAFT") throw new CampaignSendError("Campaign is already published or in progress.");

        // Mark processing to avoid double run
        await db.campaign.update({ where: { id }, data: { status: "PROCESSING" } });

        try {
          const contacts = await resolveAudience(
            before.audience, 
            before.eventId, 
            before.targeting, 
            before.customContacts
          );

          // Filter valid contacts based on channel
          const validContacts = contacts.filter(c => {
            if (before.channel === "EMAIL") return !!c.email;
            if (before.channel === "WHATSAPP") return !!c.phone;
            return false;
          });

          if (validContacts.length === 0) {
            await db.campaign.update({
              where: { id },
              data: { status: "FAILED", body: before.body + "\n\nError: No valid contacts found." }
            });
            throw new CampaignSendError("No valid contacts found.");
          }

          // Build Outbox payload
          const outboxItems = validContacts.map(contact => {
            const toAddress = before.channel === "EMAIL" ? contact.email! : contact.phone!;
            return {
              channel: before.channel,
              toAddress,
              template: "CAMPAIGN_MESSAGE",
              payload: {
                subject: before.subject || "",
                body: before.body || "",
                contactName: contact.name || ""
              },
              campaignId: before.id,
              dedupeKey: `campaign_${before.id}_${toAddress}_${Date.now()}` // add timestamp/salt if user was removed and re-added? Using unique key.
            };
          });

          // Insert into Outbox in chunks so very large audiences don't exceed query/param limits.
          const ENQUEUE_CHUNK = 500;
          for (let i = 0; i < outboxItems.length; i += ENQUEUE_CHUNK) {
            await db.outbox.createMany({
              data: outboxItems.slice(i, i + ENQUEUE_CHUNK),
              skipDuplicates: true,
            });
          }

          const after = await db.campaign.update({
            where: { id },
            data: { 
              status: "SCHEDULED",
              sentCount: outboxItems.length,
              sentAt: new Date()
            }
          });

          return { result: after, after };
        } catch (error) {
          console.error("Failed to publish campaign", error);
          const after = await db.campaign.update({
            where: { id },
            data: { status: "FAILED" }
          });
          return { result: after, after };
        }
      },
    };
  });
}

/**
 * Pauses a campaign's outbox delivery processing.
 * Business Intent: Prevent background job workers from processing queued outbox items for this campaign.
 * Side Effects: Mutates campaign status to 'PAUSED'.
 */
export function pauseCampaign(session: Session, id: string) {
  return withAudit(session, { action: "PAUSE", entity: "Campaign", entityId: id }, async () => {
    const before = await db.campaign.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        if (!before) throw new Error("Campaign not found");
        if (before.status !== "SCHEDULED") throw new Error("Only active scheduled campaigns can be paused");
        const after = await db.campaign.update({
          where: { id },
          data: { status: "PAUSED" }
        });
        return { result: after, after };
      }
    };
  });
}

/**
 * Resumes a paused campaign's outbox delivery processing.
 * Business Intent: Allow background job workers to continue processing outbox items for this campaign.
 * Side Effects: Mutates campaign status back to 'SCHEDULED'.
 */
export function resumeCampaign(session: Session, id: string) {
  return withAudit(session, { action: "RESUME", entity: "Campaign", entityId: id }, async () => {
    const before = await db.campaign.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        if (!before) throw new Error("Campaign not found");
        if (before.status !== "PAUSED") throw new Error("Only paused campaigns can be resumed");
        const after = await db.campaign.update({
          where: { id },
          data: { status: "SCHEDULED" }
        });
        return { result: after, after };
      }
    };
  });
}

/**
 * Cancels a campaign and aborts all remaining queued deliveries.
 * Business Intent: Mark campaign as cancelled and prevent any remaining outbox items from being sent.
 * Side Effects: Mutates campaign status to 'CANCELLED', sets all remaining QUEUED outbox items for this campaign to FAILED.
 */
export function cancelCampaign(session: Session, id: string) {
  return withAudit(session, { action: "CANCEL", entity: "Campaign", entityId: id }, async () => {
    const before = await db.campaign.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        if (!before) throw new Error("Campaign not found");
        if (before.status !== "SCHEDULED" && before.status !== "PAUSED") {
          throw new Error("Only scheduled or paused campaigns can be cancelled");
        }

        // Cancel campaign status
        const after = await db.campaign.update({
          where: { id },
          data: { status: "CANCELLED" }
        });

        // Abort remaining outbox items
        await db.outbox.updateMany({
          where: { campaignId: id, status: "QUEUED" },
          data: { status: "FAILED", lastError: "Campaign cancelled by administrator" }
        });

        return { result: after, after };
      }
    };
  });
}

/**
 * Resolves a configuration value from system settings, falling back to process.env.
 * Business Intent: Provide database-backed configuration overrides that can be updated dynamically in the UI.
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({ where: { key } });
  if (setting && setting.value) return setting.value;
  return process.env[key] || null;
}

/**
 * Updates a dynamic credential setting value in the database.
 * Business Intent: Store secret API keys or service IDs dynamically for outbox delivery providers.
 * Side Effects: Overwrites or inserts setting keys in the SystemSetting database table.
 */
export function updateSystemSetting(session: Session, key: string, value: string) {
  if (SECRET_SETTING_KEYS.has(key)) {
    throw new Error("This secret can only be configured via environment variables, not the database.");
  }
  return withAudit(session, { action: "UPDATE_SETTING", entity: "SystemSetting", entityId: key }, async () => {
    const before = await db.systemSetting.findUnique({ where: { key } });
    return {
      before,
      run: async () => {
        const after = await db.systemSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value }
        });
        return { result: after, after };
      }
    };
  });
}

/**
 * Lists all active config keys and values for campaign setup settings.
 * Business Intent: Expose configured keys to settings layout without displaying secret values entirely.
 */
/** Secret values are never returned to the client — only a "configured" marker. */
const SECRET_SETTING_KEYS = new Set(["RESEND_API_KEY", "WHATSAPP_CLOUD_TOKEN"]);

export async function getCampaignSettings(): Promise<Record<string, string>> {
  const settings = await db.systemSetting.findMany();
  const result: Record<string, string> = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? "CONFIGURED_IN_ENV" : "",
    WHATSAPP_CLOUD_TOKEN: process.env.WHATSAPP_CLOUD_TOKEN ? "CONFIGURED_IN_ENV" : "",
    WHATSAPP_CLOUD_PHONE_ID: process.env.WHATSAPP_CLOUD_PHONE_ID || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "Event Portal <onboarding@resend.dev>"
  };

  settings.forEach(s => {
    if (!s.value) return;
    result[s.key] = SECRET_SETTING_KEYS.has(s.key) ? "CONFIGURED_IN_DB" : s.value;
  });

  return result;
}
