"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/server/auth/guard";
import { createAddOn, updateAddOn, deleteAddOn } from "@/server/addons/service";
import { createAddOnSchema, updateAddOnSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : Number(v));

export async function createAddOnAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const data = parseOrThrow(createAddOnSchema, {
    eventId,
    name: formData.get("name"),
    pricePaise: Math.round(Number(formData.get("priceRupees")) * 100),
    maxPerBooking: num(formData.get("maxPerBooking")) ?? 5,
    stock: num(formData.get("stock")) ?? null,
    active: true,
  });
  await createAddOn(session, data);
  revalidatePath(`/admin/events/${eventId}/add-ons`);
}

export async function updateAddOnAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const data = parseOrThrow(updateAddOnSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    pricePaise: Math.round(Number(formData.get("priceRupees")) * 100),
    maxPerBooking: num(formData.get("maxPerBooking")) ?? 5,
    stock: num(formData.get("stock")) ?? null,
    active: formData.get("active") != null,
  });
  await updateAddOn(session, data);
  revalidatePath(`/admin/events/${eventId}/add-ons`);
}

export async function deleteAddOnAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  await deleteAddOn(session, String(formData.get("id")));
  revalidatePath(`/admin/events/${eventId}/add-ons`);
}
