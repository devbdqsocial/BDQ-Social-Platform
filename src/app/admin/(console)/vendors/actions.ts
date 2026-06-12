"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { action, ActionError } from "@/server/action";
import { createVendorByAdmin, VendorExistsError } from "@/server/vendors/admin-service";
import { adminCreateVendorSchema } from "@/server/schemas";
import type { Result } from "@/lib/result";

// Pilot of the action() pipeline (build-plan R0.3). Service audits internally.

const create = action({
  auth: "VENDOR_MANAGE",
  input: adminCreateVendorSchema,
  handler: async (s, d) => {
    try {
      return await createVendorByAdmin(s, d);
    } catch (e) {
      if (e instanceof VendorExistsError) throw new ActionError("VENDOR_EXISTS", "A vendor with that phone number already exists.");
      throw e;
    }
  },
});

export async function createVendorAction(formData: FormData): Promise<Result<unknown>> {
  const res = await create({
    phone: formData.get("phone"),
    name: formData.get("name") || undefined,
    brandName: formData.get("brandName"),
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    website: formData.get("website") || undefined,
    instagram: formData.get("instagram") || undefined,
  });
  if (res.ok) {
    revalidatePath("/admin/vendors");
    redirect(`/admin/vendors/${(res.data as { id: string }).id}`);
  }
  return res;
}
