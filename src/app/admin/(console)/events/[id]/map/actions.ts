"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { saveEventMap } from "@/server/events/service";
import { validateLayout } from "@/lib/map/designer-ops";

export async function saveMapAction(eventId: string, layout: unknown): Promise<void> {
  const session = await requireSuperAdmin();
  const res = validateLayout(layout);
  if (!res.ok) throw new Error(res.error);
  await saveEventMap(session, eventId, res.layout);
  revalidatePath(`/admin/events/${eventId}/map`);
  revalidatePath("/events");
}
