"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { addScheduleItem, addTicketType, deleteEvent, deleteScheduleItem, deleteTicketType, setEventTheme, updateEvent } from "@/server/events/service";
import { addDay, updateDay, deleteDay } from "@/server/events/event-days";
import { createEventSchema, eventDaySchema, eventThemeSchema, scheduleItemSchema, ticketTypeSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

export async function addTicketTypeAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const earlyRupees = formData.get("earlyRupees");
  const data = parseOrThrow(ticketTypeSchema, {
    name: formData.get("name"),
    priceInPaise: Math.round(Number(formData.get("priceRupees")) * 100),
    earlyPricePaise: earlyRupees ? Math.round(Number(earlyRupees) * 100) : undefined,
    totalQty: Number(formData.get("totalQty")),
    attendeesPer: Number(formData.get("attendeesPer") || 1),
  });
  await addTicketType(session, eventId, data);
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}

export async function deleteTicketTypeAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  await deleteTicketType(session, String(formData.get("id")));
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}

function revalidateEvent(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/schedule");
}

export async function addScheduleItemAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const data = parseOrThrow(scheduleItemSchema, {
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    title: formData.get("title"),
    stageOrZone: formData.get("stageOrZone") || undefined,
    performer: formData.get("performer") || undefined,
    eventDayId: formData.get("eventDayId") || undefined,
  });
  await addScheduleItem(session, eventId, data);
  revalidateEvent(eventId);
}

export async function deleteScheduleItemAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await deleteScheduleItem(session, String(formData.get("id")));
  revalidateEvent(String(formData.get("eventId")));
}

export async function addEventDayAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const data = parseOrThrow(eventDaySchema, {
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    label: formData.get("label") || undefined,
  });
  await addDay(session, eventId, data);
  revalidateEvent(eventId);
}

export async function updateEventDayAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const data = parseOrThrow(eventDaySchema, {
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    label: formData.get("label") || undefined,
  });
  await updateDay(session, String(formData.get("id")), data);
  revalidateEvent(String(formData.get("eventId")));
}

export async function deleteEventDayAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await deleteDay(session, String(formData.get("id")));
  revalidateEvent(String(formData.get("eventId")));
}

export async function updateEventAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const data = parseOrThrow(createEventSchema, {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
  });
  await updateEvent(session, eventId, data);
  revalidateEvent(eventId);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  await deleteEvent(session, eventId);
  revalidatePath("/admin/events");
  revalidatePath("/admin/events/past");
  revalidatePath("/events");
  redirect("/admin/events");
}

export async function setEventThemeAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const data = parseOrThrow(eventThemeSchema, {
    primary: formData.get("primary") || "",
    accent: formData.get("accent") || "",
  });
  await setEventTheme(session, eventId, data);
  revalidateEvent(eventId);
}
