"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { addScheduleItem, addTicketType, autoStaggerDay, cloneScheduleDay, deleteEvent, deleteScheduleItem, deleteTicketType, setEventLogistics, setEventPricing, setEventTheme, setVendorStalls, updateEvent } from "@/server/events/service";
import { addDay, updateDay, deleteDay } from "@/server/events/event-days";
import { eventDaySchema, eventLogisticsSchema, eventPricingSchema, eventThemeSchema, scheduleItemSchema, setVendorStallsSchema, ticketTypeSchema, updateEventSchema } from "@/server/schemas";
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

export async function autoStaggerDayAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  await autoStaggerDay(session, eventId, String(formData.get("dayId")));
  revalidateEvent(eventId);
}

export async function cloneScheduleDayAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  await cloneScheduleDay(session, eventId, String(formData.get("fromDayId")), String(formData.get("toDayId")));
  revalidateEvent(eventId);
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
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const data = parseOrThrow(updateEventSchema, {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
    slug: slug || undefined,
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

export async function setPricingRulesAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const bulkTiers = [0, 1, 2]
    .map((i) => ({ minQty: Number(formData.get(`minQty${i}`)), percent: Number(formData.get(`percent${i}`)) }))
    .filter((t) => t.minQty > 0 && t.percent > 0);
  const earlyPercent = formData.get("earlyPercent");
  const data = parseOrThrow(eventPricingSchema, {
    bulkTiers,
    earlyBird: {
      active: formData.get("earlyActive") === "on",
      percent: earlyPercent ? Number(earlyPercent) : undefined,
    },
  });
  await setEventPricing(session, eventId, data);
  revalidateEvent(eventId);
}

export async function setEventLogisticsAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const closeHours = formData.get("addOnCloseHours");
  const data = parseOrThrow(eventLogisticsSchema, {
    addOnCloseHours: closeHours ? Number(closeHours) : undefined,
    loadInStartsAt: formData.get("loadInStartsAt") || undefined,
    loadInEndsAt: formData.get("loadInEndsAt") || undefined,
  });
  await setEventLogistics(session, eventId, data);
  revalidateEvent(eventId);
}

export async function setVendorStallsAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const data = parseOrThrow(setVendorStallsSchema, { enabled: formData.get("vendorStallsEnabled") === "on" });
  await setVendorStalls(session, eventId, data.enabled);
  revalidateEvent(eventId);
  revalidatePath("/vendor/events");
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
