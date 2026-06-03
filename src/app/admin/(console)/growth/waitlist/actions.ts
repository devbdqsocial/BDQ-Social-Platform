"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guard";
import { notifyWaitlist } from "@/server/waitlist/service";

export async function notifyWaitlistAction(formData: FormData): Promise<void> {
  const session = await requirePermission("CUSTOMER_VIEW");
  await notifyWaitlist(session, String(formData.get("eventId")));
  revalidatePath("/admin/growth/waitlist");
}
