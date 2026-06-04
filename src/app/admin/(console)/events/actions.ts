"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { createEvent, publishEvent } from "@/server/events/service";
import { createEventSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

export async function createEventAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const data = parseOrThrow(createEventSchema, {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
  });
  await createEvent(session, data);
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

export async function publishEventAction(formData: FormData) {
  const session = await requireSuperAdmin();
  await publishEvent(session, String(formData.get("id")));
  revalidatePath("/admin/events");
  revalidatePath("/events");
}
