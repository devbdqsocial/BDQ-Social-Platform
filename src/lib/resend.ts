import "server-only";
import { Resend } from "resend";
import { db } from "@/server/db";

/** Resend adapter — transactional email. API key stays env-only; sender can be overridden in settings. */

let instance: Resend | null = null;

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend API key is not configured.");
  if (!instance) instance = new Resend(key);
  return instance;
}

export function resendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
}

async function emailFrom(): Promise<string> {
  const row = await db.systemSetting.findUnique({ where: { key: "EMAIL_FROM" }, select: { value: true } }).catch(() => null);
  return row?.value?.trim() || process.env.EMAIL_FROM || "BDQ Social <hello@bdqsocial.com>";
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  tags?: { name: string; value: string }[];
}): Promise<{ id: string }> {
  const from = await emailFrom();
  const { data, error } = await getClient().emails.send({
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
