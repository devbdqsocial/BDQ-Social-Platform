"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { upsertStaff, removeStaffAccess, StaffEmailTakenError } from "@/server/staff/service";
import { isStaffPreset } from "@/lib/staff-presets";

export async function saveStaffAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const email = String(formData.get("email") || "").trim();
  const preset = String(formData.get("preset") || "");
  const name = String(formData.get("name") || "").trim() || undefined;
  const password = String(formData.get("password") || "") || undefined;
  if (!email || !isStaffPreset(preset)) throw new Error("Enter an email and pick a role.");
  try {
    await upsertStaff(session, { email, name, preset, password });
  } catch (e) {
    if (e instanceof StaffEmailTakenError) throw new Error("That email already belongs to another account.");
    throw e;
  }
  revalidatePath("/admin/ops/staff");
}

export async function removeStaffAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await removeStaffAccess(session, String(formData.get("id")));
  revalidatePath("/admin/ops/staff");
}
