"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/server/auth/guard";
import { addScheduleItem, addTicketType, deleteEvent, deleteScheduleItem, deleteTicketType, setEventTheme, updateEvent } from "@/server/events/service";
import { createEventSchema, eventThemeSchema, scheduleItemSchema, ticketTypeSchema } from "@/server/schemas";

export async function addTicketTypeAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  const earlyRupees = formData.get("earlyRupees");
  const parsed = ticketTypeSchema.safeParse({
    name: formData.get("name"),
    priceInPaise: Math.round(Number(formData.get("priceRupees")) * 100),
    earlyPricePaise: earlyRupees ? Math.round(Number(earlyRupees) * 100) : undefined,
    totalQty: Number(formData.get("totalQty")),
    attendeesPer: Number(formData.get("attendeesPer") || 1),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid ticket type");
  await addTicketType(session, eventId, parsed.data);
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}

export async function deleteTicketTypeAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  await deleteTicketType(session, String(formData.get("id")));
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}

function revalidateEvent(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}

export async function addScheduleItemAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  const parsed = scheduleItemSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    title: formData.get("title"),
    stageOrZone: formData.get("stageOrZone") || undefined,
    performer: formData.get("performer") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid schedule item");
  await addScheduleItem(session, eventId, parsed.data);
  revalidateEvent(eventId);
}

export async function deleteScheduleItemAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await deleteScheduleItem(session, String(formData.get("id")));
  revalidateEvent(String(formData.get("eventId")));
}

export async function updateEventAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  const parsed = createEventSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  await updateEvent(session, eventId, parsed.data);
  revalidateEvent(eventId);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  await deleteEvent(session, eventId);
  revalidatePath("/admin/events");
  revalidatePath("/admin/events/past");
  revalidatePath("/events");
  redirect("/admin/events");
}

export async function setEventThemeAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  const parsed = eventThemeSchema.safeParse({
    primary: formData.get("primary") || "",
    accent: formData.get("accent") || "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid colors");
  await setEventTheme(session, eventId, parsed.data);
  revalidateEvent(eventId);
}
