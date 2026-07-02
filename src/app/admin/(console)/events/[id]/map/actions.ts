"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdminRole } from "@/server/auth/guard";
import { saveEventMap } from "@/server/events/service";
import { saveStallType, deleteStallType, duplicateStallType } from "@/server/map/stall-types";
import { stallTypeSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";
import { upgradeLayout, exceedsSizeCap } from "@/lib/map/layout-v2";
import { signUpload, type UploadSignature } from "@/lib/cloudinary";

export async function getMapUploadSignatureAction(): Promise<UploadSignature> {
  await requireAdminRole();
  return signUpload("bdq/maps");
}

export async function saveMapAction(eventId: string, layout: unknown): Promise<void> {
  const session = await requireAdminRole();
  // Normalize v1 OR v2 input to v2 (upgradeLayout is the one load path); reject oversize.
  const v2 = upgradeLayout(layout);
  if (exceedsSizeCap(v2)) throw new Error("This layout is too large to save — delete old versions.");
  await saveEventMap(session, eventId, v2);
  revalidatePath(`/admin/events/${eventId}/map`);
  revalidatePath("/events");
}

export async function saveStallTypeAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const data = parseOrThrow(stallTypeSchema, {
    name: formData.get("name"),
    widthFt: Number(formData.get("widthFt")),
    heightFt: Number(formData.get("heightFt")),
    priceInPaise: Math.round(Number(formData.get("priceRupees") || 0) * 100),
    color: String(formData.get("color") || "#3FA66A"),
    sellable: formData.get("sellable") === "on",
  });
  try {
    await saveStallType(session, eventId, data, id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("A stall type with that name already exists.");
    }
    throw e;
  }
  revalidatePath(`/admin/events/${eventId}/map`);
}

export async function deleteStallTypeAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  await deleteStallType(session, String(formData.get("id")));
  revalidatePath(`/admin/events/${eventId}/map`);
}

export async function duplicateStallTypeAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const eventId = String(formData.get("eventId"));
  await duplicateStallType(session, String(formData.get("id")));
  revalidatePath(`/admin/events/${eventId}/map`);
}
