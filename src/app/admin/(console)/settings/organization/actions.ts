"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { saveOrgSettings } from "@/server/settings/service";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Save the organization (BDQ master account) details. SUPER_ADMIN only; audited. */
export async function saveOrgAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await saveOrgSettings(session, {
    legalName: s(formData, "legalName"),
    address: s(formData, "address"),
    gstin: s(formData, "gstin"),
    pan: s(formData, "pan"),
    supportEmail: s(formData, "supportEmail"),
    supportPhone: s(formData, "supportPhone"),
    website: s(formData, "website"),
  });
  revalidatePath("/admin/settings/organization");
}
