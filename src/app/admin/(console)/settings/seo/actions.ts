"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { saveSeoSettings } from "@/server/settings/service";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Save SEO defaults (overrides the hardcoded site meta). SUPER_ADMIN only; audited. */
export async function saveSeoAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await saveSeoSettings(session, { title: s(formData, "title"), description: s(formData, "description"), ogImage: s(formData, "ogImage") });
  revalidatePath("/admin/settings/seo");
}
