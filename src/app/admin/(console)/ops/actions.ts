"use server";

import { z } from "zod";
import type { Result } from "@/lib/result";
import { toResult } from "@/server/action";
import { requireSuperAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import { emailConfigured, sendEmail } from "@/lib/sendgrid";
import { verifyEmailHtml } from "@/lib/email-template";

const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Live email ping (SUPER_ADMIN): actually send a test email through SendGrid so a real delivery
 * failure surfaces here instead of the page silently trusting a "configured" flag. Defaults to the
 * super-admin's own address.
 */
export async function sendTestEmailAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireSuperAdmin();
    let to = String(formData.get("to") || "").trim();
    if (!to) {
      const u = await db.user.findUnique({ where: { id: session.userId }, select: { email: true } });
      to = u?.email ?? "";
    }
    const parsed = emailSchema.safeParse(to);
    if (!parsed.success) throw new Error("Enter a valid email address to send the test to.");
    if (!(await emailConfigured())) throw new Error("Email isn't configured — no SendGrid key in env or settings.");
    await sendEmail({ to: parsed.data, subject: "BDQ Social — email is working", html: verifyEmailHtml() });
  });
}
