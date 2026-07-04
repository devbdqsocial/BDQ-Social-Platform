"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/server/auth/guard";
import { setStaffPermissions } from "@/server/staff/service";
import { PERMISSION_KEYS } from "@/lib/permissions";

const ALL = PERMISSION_KEYS;

/**
 * Saves permission changes and optional role updates for a teammate.
 * This function handles fine-grained permission setting. It parses the optional
 * 'role' dropdown field (only submitted by SUPER_ADMINs) and validates it against
 * standard roles before updating the teammate record.
 *
 * @throws {Error} If session authorization is invalid or boundaries are crossed.
 */
export async function setPermissionsAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const id = String(formData.get("id"));
  const selected = formData.getAll("perm").map(String);
  const permissions = ALL.filter((p) => selected.includes(p));
  
  const roleVal = formData.get("role");
  const role = (roleVal === "STAFF" || roleVal === "ADMIN") ? roleVal : undefined;

  await setStaffPermissions(session, id, permissions, role);
  revalidatePath("/admin/system/roles");
}

