"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { setStaffPermissions } from "@/server/staff/service";

const ALL = ["CHECKIN", "VENDOR_MANAGE", "VENDOR_VIEW", "EVENT_VIEW", "CUSTOMER_VIEW", "PAYMENT_VIEW"] as const;

export async function setPermissionsAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const id = String(formData.get("id"));
  const selected = formData.getAll("perm").map(String);
  const permissions = ALL.filter((p) => selected.includes(p));
  await setStaffPermissions(session, id, permissions);
  revalidatePath("/admin/system/roles");
}
