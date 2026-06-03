"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "@/server/auth/guard";
import { saveEventMap } from "@/server/events/service";
import { saveStallType, deleteStallType } from "@/server/map/stall-types";
import { saveAsTemplate, applyTemplate } from "@/server/map/templates";
import { stallTypeSchema } from "@/server/schemas";
import { validateLayout } from "@/lib/map/designer-ops";
import { signUpload, type UploadSignature } from "@/lib/cloudinary";

export async function getMapUploadSignatureAction(): Promise<UploadSignature> {
  await requireSuperAdmin();
  return signUpload("bdq/maps");
}

export async function saveMapAction(eventId: string, layout: unknown): Promise<void> {
  const session = await requireSuperAdmin();
  const res = validateLayout(layout);
  if (!res.ok) throw new Error(res.error);
  await saveEventMap(session, eventId, res.layout);
  revalidatePath(`/admin/events/${eventId}/map`);
  revalidatePath("/events");
}

export async function saveStallTypeAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const parsed = stallTypeSchema.safeParse({
    name: formData.get("name"),
    widthFt: Number(formData.get("widthFt")),
    heightFt: Number(formData.get("heightFt")),
    priceInPaise: Math.round(Number(formData.get("priceRupees") || 0) * 100),
    color: String(formData.get("color") || "#3FA66A"),
    sellable: formData.get("sellable") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid stall type");
  try {
    await saveStallType(session, eventId, parsed.data, id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("A stall type with that name already exists.");
    }
    throw e;
  }
  revalidatePath(`/admin/events/${eventId}/map`);
}

export async function deleteStallTypeAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const eventId = String(formData.get("eventId"));
  await deleteStallType(session, String(formData.get("id")));
  revalidatePath(`/admin/events/${eventId}/map`);
}

export async function saveTemplateAction(eventId: string, name: string): Promise<void> {
  const session = await requireSuperAdmin();
  if (name.trim().length < 2) throw new Error("Name the template");
  await saveAsTemplate(session, eventId, name.trim());
  revalidatePath(`/admin/events/${eventId}/map`);
}

export async function applyTemplateAction(eventId: string, templateId: string): Promise<void> {
  const session = await requireSuperAdmin();
  if (!templateId) throw new Error("Choose a template");
  await applyTemplate(session, eventId, templateId);
  revalidatePath(`/admin/events/${eventId}/map`);
  revalidatePath("/events");
}
