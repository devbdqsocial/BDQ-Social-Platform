"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { phone10, normalizePhone } from "@/lib/validators";
import { whatsAppConfigured } from "@/lib/whatsapp";
import { processOutbox } from "@/server/notifications/outbox";

export type WaitlistResult = { error: string } | { ok: true; alreadyJoined: boolean; position: number };

export async function joinPlatformWaitlist(formData: FormData): Promise<WaitlistResult> {
  const type = formData.get("interestedInStall") === "true" ? "STALL" : "TICKET";

  // Exactly 10 digits (first 6-9); stored as E.164 (+91…) to match the rest of the app.
  const parsed = phone10.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid 10-digit mobile number." };
  }
  const formattedPhone = normalizePhone(parsed.data);

  try {
    const existing = await db.waitlist.findFirst({ where: { source: "PLATFORM", phone: formattedPhone } });

    if (existing) {
      await db.waitlist.update({ where: { id: existing.id }, data: { type } });
    } else {
      await db.waitlist.create({ data: { source: "PLATFORM", type, phone: formattedPhone, contact: formattedPhone } });
      // Real "we'll WhatsApp you" confirmation — enqueued durably, sent best-effort now, cron drains the rest.
      // Only when a provider is configured; dedupeKey guarantees one confirmation per number.
      if (whatsAppConfigured()) {
        try {
          await db.outbox.upsert({
            where: { dedupeKey: `waitlist:${formattedPhone}` },
            update: {},
            create: { channel: "WHATSAPP", toAddress: formattedPhone, template: "waitlist", payload: { type }, dedupeKey: `waitlist:${formattedPhone}` },
          });
          await processOutbox(5);
        } catch (e) {
          console.error("Waitlist confirmation failed (queued for retry):", e);
        }
      }
    }

    const position = await db.waitlist.count({ where: { source: "PLATFORM" } });
    try {
      revalidatePath("/coming-soon");
    } catch {
      // ignore revalidation error in test environments
    }
    return { ok: true, alreadyJoined: !!existing, position };
  } catch (error) {
    console.error("Waitlist error:", error);
    return { error: "Couldn't join the list. Please try again." };
  }
}
