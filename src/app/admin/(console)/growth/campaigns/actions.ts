"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { createCampaign, sendCampaign, CampaignSendError, pauseCampaign, resumeCampaign, cancelCampaign, updateSystemSetting, CampaignInput } from "@/server/campaigns/service";
import { campaignSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

import { redirect } from "next/navigation";

export async function createCampaignAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const data = parseOrThrow(campaignSchema, {
    name: formData.get("name"),
    channel: formData.get("channel"),
    audience: "ALL", // Default, can be changed in the builder
  });
  const res = await createCampaign(session, data as CampaignInput);
  redirect(`/admin/growth/campaigns/${res.id}/edit`);
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

/**
 * Update system API setting key.
 * Business Intent: Store overridden credentials in the database to override env variables securely.
 * Side Effects: Mutates SystemSetting schema row, triggers path revalidation.
 */
export async function updateSettingAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const key = String(formData.get("key"));
  const value = String(formData.get("value"));
  if (!key) throw new Error("Key is required");
  await updateSystemSetting(session, key, value);
  revalidatePath("/admin/growth/campaigns");
}

/**
 * Pause active campaign outbox.
 * Business Intent: Stop outbox processor from processing queued records for this campaign.
 * Side Effects: Revalidates paths, mutates campaign status.
 */
export async function pauseCampaignAction(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSuperAdmin();
  try {
    await pauseCampaign(session, campaignId);
    revalidatePath(`/admin/growth/campaigns/${campaignId}/edit`);
    revalidatePath("/admin/growth/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" };
  }
}

/**
 * Resume paused campaign.
 * Business Intent: Restart queue processing for this paused campaign.
 * Side Effects: Revalidates paths, mutates campaign status.
 */
export async function resumeCampaignAction(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSuperAdmin();
  try {
    await resumeCampaign(session, campaignId);
    revalidatePath(`/admin/growth/campaigns/${campaignId}/edit`);
    revalidatePath("/admin/growth/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" };
  }
}

/**
 * Cancel campaign.
 * Business Intent: Abort campaign delivery run completely.
 * Side Effects: Revalidates paths, aborts queued outbox entries, mutates status.
 */
export async function cancelCampaignAction(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSuperAdmin();
  try {
    await cancelCampaign(session, campaignId);
    revalidatePath(`/admin/growth/campaigns/${campaignId}/edit`);
    revalidatePath("/admin/growth/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" };
  }
}

