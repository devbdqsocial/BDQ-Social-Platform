"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { archiveEvent } from "@/server/events/archive-service";
import { deleteEvent } from "@/server/events/service";

/** Archive an event (snapshot + free storage). SUPER_ADMIN only; audited by the service. */
export async function dangerArchiveEvent(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await archiveEvent(session, String(formData.get("eventId")));
  revalidatePath("/admin/settings/danger");
}

/** Permanently delete an event and all dependents. Requires typing the exact name. Irreversible; audited. */
export async function dangerDeleteEvent(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  const name = String(formData.get("name") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm.trim() !== name.trim() || !name.trim()) {
    throw new Error("Type the event name exactly to confirm.");
  }
  await deleteEvent(session, eventId);
  revalidatePath("/admin/settings/danger");
}
