"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { saveFlags, FEATURE_FLAGS } from "@/server/settings/service";

/** Save feature-flag toggles. SUPER_ADMIN only; audited. */
export async function saveFlagsAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const input: Record<string, boolean> = {};
  for (const f of FEATURE_FLAGS) input[f.key] = formData.get(f.key) === "on";
  await saveFlags(session, input);
  revalidatePath("/admin/settings/flags");
}
