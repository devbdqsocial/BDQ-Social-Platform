"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { saveAnalyticsSettings } from "@/server/settings/service";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Save analytics tracking IDs. SUPER_ADMIN only; audited. */
export async function saveAnalyticsAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await saveAnalyticsSettings(session, { ga4: s(formData, "ga4"), metaPixel: s(formData, "metaPixel"), clarity: s(formData, "clarity") });
  revalidatePath("/admin/settings/analytics");
}
