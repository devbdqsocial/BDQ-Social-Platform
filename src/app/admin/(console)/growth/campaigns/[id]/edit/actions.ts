"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { updateCampaign, sendCampaign } from "@/server/campaigns/service";
import { db } from "@/server/db";

export async function updateCampaignAction(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await requireSuperAdmin();
  try {
    const rawContacts = formData.get("customContacts");
    let parsedContacts = null;
    if (rawContacts) {
      const lines = String(rawContacts).split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      parsedContacts = lines.map(line => {
        if (line.includes("@")) {
          return { name: line.split("@")[0], email: line, phone: null };
        } else {
          return { name: "Custom Recipient", email: null, phone: line };
        }
      });
    }

    const data = {
      audience: String(formData.get("audience")),
      subject: formData.get("subject") ? String(formData.get("subject")) : undefined,
      body: formData.get("body") ? String(formData.get("body")) : undefined,
      customContacts: parsedContacts || undefined
    };
    
    await updateCampaign(session, id, data);
    revalidatePath(`/admin/growth/campaigns/${id}/edit`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" };
  }
}

export async function publishCampaignAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSuperAdmin();
  try {
    await sendCampaign(session, id);
    revalidatePath(`/admin/growth/campaigns/${id}/edit`);
    revalidatePath("/admin/growth/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" };
  }
}

/**
 * Fetches campaign progress metrics and list of outbox deliveries in real-time.
 * Business Intent: Provide admin UI with live delivery log data and stats updates for charting.
 */
export async function getCampaignProgressAction(id: string) {
  await requireSuperAdmin();
  try {
    const campaign = await db.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        sentCount: true,
        stats: true,
      }
    });

    const outboxItems = await db.outbox.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        toAddress: true,
        status: true,
        attempts: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return { success: true, campaign, outboxItems };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "An unknown error occurred" };
  }
}
