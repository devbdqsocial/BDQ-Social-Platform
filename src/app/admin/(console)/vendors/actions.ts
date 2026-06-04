"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/auth/guard";
import { createVendorByAdmin, VendorExistsError } from "@/server/vendors/admin-service";
import { adminCreateVendorSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

export async function createVendorAction(formData: FormData): Promise<void> {
  const session = await requirePermission("VENDOR_MANAGE");
  const data = parseOrThrow(adminCreateVendorSchema, {
    phone: formData.get("phone"),
    name: formData.get("name") || undefined,
    brandName: formData.get("brandName"),
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    website: formData.get("website") || undefined,
    instagram: formData.get("instagram") || undefined,
  });
  let id: string;
  try {
    const profile = await createVendorByAdmin(session, data);
    id = profile.id;
  } catch (e) {
    if (e instanceof VendorExistsError) throw new Error("A vendor with that phone number already exists.");
    throw e;
  }
  revalidatePath("/admin/vendors");
  redirect(`/admin/vendors/${id}`);
}
