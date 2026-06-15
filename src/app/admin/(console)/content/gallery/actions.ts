"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEventId } from "@/server/admin/event-context";
import { signUpload, type UploadSignature } from "@/lib/cloudinary";
import {
  addGalleryPhoto, setGalleryCaption, setGalleryPublished, publishAllGallery, deleteGalleryPhoto, moveGalleryPhoto,
} from "@/server/content/admin-gallery";

const GALLERY = "/admin/content/gallery";

export async function getGalleryUploadSignatureAction(): Promise<UploadSignature> {
  await requireAdminRole();
  return signUpload("bdq/gallery");
}

export async function addGalleryPhotoAction(url: string, publicId: string): Promise<void> {
  const session = await requireAdminRole();
  const eventId = await getActiveEventId();
  if (!eventId) throw new Error("No active event");
  await addGalleryPhoto(session, eventId, url, publicId);
  revalidatePath(GALLERY);
}

export async function setCaptionAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await setGalleryCaption(session, String(formData.get("id")), String(formData.get("caption") ?? ""));
  revalidatePath(GALLERY);
}

export async function togglePublishedAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await setGalleryPublished(session, String(formData.get("id")), formData.get("published") === "true");
  revalidatePath(GALLERY);
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await deleteGalleryPhoto(session, String(formData.get("id")));
  revalidatePath(GALLERY);
}

export async function moveAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await moveGalleryPhoto(session, String(formData.get("id")), formData.get("dir") === "up" ? "up" : "down");
  revalidatePath(GALLERY);
}

export async function publishAllAction(): Promise<void> {
  const session = await requireAdminRole();
  const eventId = await getActiveEventId();
  if (!eventId) throw new Error("No active event");
  await publishAllGallery(session, eventId);
  revalidatePath(GALLERY);
}
