"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { createCampaign, sendCampaign, CampaignSendError } from "@/server/campaigns/service";
import { campaignSchema } from "@/server/schemas";

export async function createCampaignAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    audience: formData.get("audience"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid campaign");
  await createCampaign(session, parsed.data);
  revalidatePath("/admin/growth/campaigns");
}

export async function sendCampaignAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  try {
    await sendCampaign(session, String(formData.get("id")));
  } catch (e) {
    if (e instanceof CampaignSendError) throw new Error(e.message);
    throw e;
  }
  revalidatePath("/admin/growth/campaigns");
}
