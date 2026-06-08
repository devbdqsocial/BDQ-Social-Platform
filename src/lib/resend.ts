import "server-only";
import { Resend } from "resend";

/** Resend adapter — transactional email. API key + From are env-only (never stored in the DB). */

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

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  tags?: { name: string; value: string }[];
}): Promise<{ id: string }> {
  const from = process.env.EMAIL_FROM ?? "Event Portal <onboarding@resend.dev>";
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
