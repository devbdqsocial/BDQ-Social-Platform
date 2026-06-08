"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guard";
import { createSponsorship, setSponsorshipStatus } from "@/server/finance/sponsorship";
import { sponsorshipSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

const PATH = "/admin/finance/sponsorships";

export async function saveSponsorshipAction(formData: FormData): Promise<void> {
  const session = await requirePermission("FINANCE_MANAGE");
  const data = parseOrThrow(sponsorshipSchema, {
    eventId: String(formData.get("eventId") || "") || undefined,
    sponsorName: formData.get("sponsorName"),
    tier: String(formData.get("tier") || "") || undefined,
    amountPaise: Math.round(Number(formData.get("amountRupees")) * 100),
    status: formData.get("status") || "PROPOSED",
    note: String(formData.get("note") || "") || undefined,
  });
  await createSponsorship(session, data);
  revalidatePath(PATH);
}

export async function setSponsorshipStatusAction(formData: FormData): Promise<void> {
  const session = await requirePermission("FINANCE_MANAGE");
  const status = String(formData.get("status")) as "PROPOSED" | "SIGNED" | "PAID";
  await setSponsorshipStatus(session, String(formData.get("id")), status);
  revalidatePath(PATH);
}
