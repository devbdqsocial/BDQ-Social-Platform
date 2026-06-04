"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { createSponsor, deleteSponsor } from "@/server/sponsors/service";
import { sponsorSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

export async function createSponsorAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const data = parseOrThrow(sponsorSchema, {
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    tier: formData.get("tier"),
    logoUrl: formData.get("logoUrl") || "",
  });
  await createSponsor(session, data);
  revalidatePath("/admin/growth/sponsors");
  revalidatePath("/");
}

export async function deleteSponsorAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await deleteSponsor(session, String(formData.get("id")));
  revalidatePath("/admin/growth/sponsors");
  revalidatePath("/");
}
