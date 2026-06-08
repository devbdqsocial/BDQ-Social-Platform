import "server-only";
import { Resend } from "resend";
import { db } from "@/server/db";

/** Resend adapter — transactional email. Secret stays server-side. */

let instance: Resend | null = null;
let lastUsedKey: string | null = null;

async function getClient(): Promise<Resend> {
  const dbKey = await db.systemSetting.findUnique({ where: { key: "RESEND_API_KEY" } });
  const key = (dbKey && dbKey.value) ? dbKey.value : process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend API key is not configured.");
  
  if (key !== lastUsedKey || !instance) {
    lastUsedKey = key;
    instance = new Resend(key);
    (global as typeof globalThis & { __resend_configured_cache?: boolean }).__resend_configured_cache = true;
  }
  return instance;
}

export function resendConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY || (global as typeof globalThis & { __resend_configured_cache?: boolean }).__resend_configured_cache);
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  tags?: { name: string; value: string }[];
}): Promise<{ id: string }> {
  const dbFrom = await db.systemSetting.findUnique({ where: { key: "EMAIL_FROM" } });
  const from = (dbFrom && dbFrom.value) ? dbFrom.value : (process.env.EMAIL_FROM ?? "Event Portal <onboarding@resend.dev>");

  const clientInstance = await getClient();
  const { data, error } = await clientInstance.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
    tags: opts.tags,
  });
  if (error) throw new Error(error.message ?? "Resend send failed");
  return { id: data?.id ?? "" };
}

