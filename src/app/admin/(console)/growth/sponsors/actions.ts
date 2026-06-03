"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { createSponsor, deleteSponsor } from "@/server/sponsors/service";
import { sponsorSchema } from "@/server/schemas";

export async function createSponsorAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const parsed = sponsorSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    tier: formData.get("tier"),
    logoUrl: formData.get("logoUrl") || "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid sponsor");
  await createSponsor(session, parsed.data);
  revalidatePath("/admin/growth/sponsors");
  revalidatePath("/");
}

export async function deleteSponsorAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await deleteSponsor(session, String(formData.get("id")));
  revalidatePath("/admin/growth/sponsors");
  revalidatePath("/");
}
