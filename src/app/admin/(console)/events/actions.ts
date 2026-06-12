"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/server/action";
import { createEvent, publishEvent } from "@/server/events/service";
import { archiveEvent, unarchiveEvent } from "@/server/events/archive-service";
import { createEventSchema, idActionSchema } from "@/server/schemas";
import type { Result } from "@/lib/result";

// Pilot of the action() pipeline (build-plan R0.3). Services audit internally (withAudit),
// so no audit meta here. "ADMIN" = SUPER_ADMIN + ADMIN (matches the old requireSuperAdmin gate).

const create = action({ auth: "ADMIN", input: createEventSchema, handler: (s, d) => createEvent(s, d) });
const publish = action({ auth: "ADMIN", input: idActionSchema, handler: (s, d) => publishEvent(s, d.id) });
const archive = action({ auth: "ADMIN", input: idActionSchema, handler: (s, d) => archiveEvent(s, d.id) });
const unarchive = action({ auth: "ADMIN", input: idActionSchema, handler: (s, d) => unarchiveEvent(s, d.id) });

function revalidateEvents() {
  revalidatePath("/admin/events");
  revalidatePath("/admin/events/past");
  revalidatePath("/events");
}

export async function createEventAction(formData: FormData): Promise<Result<unknown>> {
  const res = await create({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
  });
  if (res.ok) revalidateEvents();
  return res;
}

export async function publishEventAction(formData: FormData): Promise<Result<unknown>> {
  const res = await publish({ id: String(formData.get("id")) });
  if (res.ok) revalidateEvents();
  return res;
}

export async function archiveEventAction(formData: FormData): Promise<Result<unknown>> {
  const res = await archive({ id: String(formData.get("id")) });
  if (res.ok) revalidateEvents();
  return res;
}

export async function unarchiveEventAction(formData: FormData): Promise<Result<unknown>> {
  const res = await unarchive({ id: String(formData.get("id")) });
  if (res.ok) revalidateEvents();
  return res;
}
