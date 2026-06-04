"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { createCampaign, sendCampaign, CampaignSendError } from "@/server/campaigns/service";
import { campaignSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

export async function createCampaignAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const data = parseOrThrow(campaignSchema, {
    name: formData.get("name"),
    channel: formData.get("channel"),
    audience: formData.get("audience"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body") || undefined,
  });
  await createCampaign(session, data);
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
