import "server-only";
import { Resend } from "resend";

/** Resend adapter — transactional email. Secret stays server-side. */

let instance: Resend | null = null;

function client(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend not configured");
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
}): Promise<{ id: string }> {
  const from = process.env.EMAIL_FROM ?? "BDQ Social <onboarding@resend.dev>";
  const { data, error } = await client().emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
  });
  if (error) throw new Error(error.message ?? "Resend send failed");
  return { id: data?.id ?? "" };
}
