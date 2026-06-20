"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { forceLogoutAllAdmins } from "@/server/settings/security";

/** Sign out all admins/staff except the caller. SUPER_ADMIN only; audited. */
export async function forceLogoutAllAction(): Promise<{ count: number }> {
  const session = await requireSuperAdmin();
  const count = await forceLogoutAllAdmins(session);
  revalidatePath("/admin/settings/security");
  return { count };
}
