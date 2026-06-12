"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { createMap, saveMapLayout, attachMapToEvent } from "@/server/map/maps";
import { validateLayout } from "@/lib/map/designer-ops";

const M_TO_FT = 3.28084;

export async function createMapAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const name = String(formData.get("name") || "").trim();
  if (name.length < 2) throw new Error("Name the map");
  const unit = formData.get("unit") === "M" ? "M" : "FT";
  const k = unit === "M" ? M_TO_FT : 1;
  const widthFt = Math.round(Number(formData.get("width")) * k);
  const heightFt = Math.round(Number(formData.get("length")) * k);
  if (!(widthFt > 0 && heightFt > 0)) throw new Error("Enter a width and length");
  const map = await createMap(session, {
    name,
    description: String(formData.get("description") || "") || undefined,
    locationName: String(formData.get("location") || "") || undefined,
    unit,
    widthFt,
    heightFt,
    gridFt: Number(formData.get("gridFt") || 5),
  });
  revalidatePath("/admin/venue/maps");
  redirect(`/admin/venue/maps/${map.id}`);
}

export async function saveMapLayoutAction(mapId: string, layout: unknown): Promise<void> {
  const session = await requireAdminRole();
  const res = validateLayout(layout);
  if (!res.ok) throw new Error(res.error);
  await saveMapLayout(session, mapId, res.layout);
  revalidatePath(`/admin/venue/maps/${mapId}`);
}

export async function attachMapAction(eventId: string, mapId: string): Promise<void> {
  const session = await requireAdminRole();
  await attachMapToEvent(session, eventId, mapId);
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
}
