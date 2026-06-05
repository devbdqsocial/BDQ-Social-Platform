"use server";

import { revalidatePath } from "next/cache";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { signContract } from "@/server/vendors/contract";

export async function signContractAction(formData: FormData): Promise<void> {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) throw new Error("Create your brand profile first.");
  if (formData.get("agree") !== "on") throw new Error("Please tick the box to agree before signing.");
  await signContract(session, profile.id);
  revalidatePath("/vendor/contract");
  revalidatePath("/vendor");
}
