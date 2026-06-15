"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEventId } from "@/server/admin/event-context";
import { updateSystemSetting } from "@/server/campaigns/service";
import { GUIDE_HEADINGS, serializeGuide } from "@/lib/content-gate";

export async function saveGuideAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = await getActiveEventId();
  if (!eventId) throw new Error("No active event");
  const bodies = GUIDE_HEADINGS.map((_, i) => String(formData.get(`s_${i}`) ?? ""));
  await updateSystemSetting(session, `guide:${eventId}`, serializeGuide(bodies));
  revalidatePath("/admin/content/guide");
  revalidatePath("/guide");
}
