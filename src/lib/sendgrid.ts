import "server-only";
import sgMail from "@sendgrid/mail";
import type { AttachmentData } from "@sendgrid/helpers/classes/attachment";
import { db } from "@/server/db";

/** SendGrid adapter — transactional email. API key + sender resolve DB-first, env fallback. */

async function apiKey(): Promise<string | null> {
  const row = await db.systemSetting.findUnique({ where: { key: "SENDGRID_API_KEY" }, select: { value: true } }).catch(() => null);
  return row?.value?.trim() || process.env.SENDGRID_API_KEY || null;
}

export async function emailConfigured(): Promise<boolean> {
  return !!(await apiKey());
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  contentId?: string;
}

async function emailFrom(): Promise<string> {
  const row = await db.systemSetting.findUnique({ where: { key: "EMAIL_FROM" }, select: { value: true } }).catch(() => null);
  return row?.value?.trim() || process.env.EMAIL_FROM || "BDQ Social <hello@bdqsocial.com>";
}

/** SendGrid needs {email,name}; it does not parse the combined "Name <email>" RFC string. */
function parseFrom(s: string): { email: string; name?: string } {
  const m = s.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { email: m[2].trim(), name: m[1] || undefined } : { email: s.trim() };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  tags?: { name: string; value: string }[];
}): Promise<{ id: string }> {
  const key = await apiKey();
  if (!key) throw new Error("SendGrid API key is not configured.");
  sgMail.setApiKey(key);

  const [res] = await sgMail.send({
    to: opts.to,
    from: parseFrom(await emailFrom()),
    subject: opts.subject,
    html: opts.html,
    // @sendgrid/mail sends attachment object keys verbatim (its key-casing pass skips array
    // items), so the API needs snake_case `content_id` — `contentId` is silently dropped.
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: (Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content)).toString("base64"),
      type: a.contentType,
      disposition: a.contentId ? "inline" : "attachment",
      content_id: a.contentId,
    })) as unknown as AttachmentData[],
    customArgs: opts.tags ? Object.fromEntries(opts.tags.map((t) => [t.name, t.value])) : undefined,
  });
  const id = res.headers["x-message-id"];
  return { id: typeof id === "string" ? id : "" };
}
