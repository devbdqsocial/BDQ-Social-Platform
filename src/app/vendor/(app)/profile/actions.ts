"use server";

import { revalidatePath } from "next/cache";
import { requireVendor } from "@/server/auth/guard";
import { addAsset, deleteAsset, upsertKyc, upsertProfile } from "@/server/vendors/service";
import { vendorKycSchema, vendorProfileSchema } from "@/server/schemas";
import { signUpload, type UploadSignature } from "@/lib/cloudinary";
import { isAllowedAssetKind } from "@/lib/assets";
import { parseOrThrow } from "@/lib/validation";

export async function getUploadSignatureAction(kind: string): Promise<UploadSignature> {
  await requireVendor();
  if (!isAllowedAssetKind(kind)) throw new Error("Invalid asset kind");
  return signUpload(`bdq/vendors/${kind.toLowerCase()}`);
}

export async function saveAssetAction(kind: string, url: string, publicId: string): Promise<void> {
  const session = await requireVendor();
  if (!isAllowedAssetKind(kind)) throw new Error("Invalid asset kind");
  await addAsset(session.userId, kind, url, publicId);
  revalidatePath("/vendor/profile");
  revalidatePath("/vendor");
}

export async function deleteAssetAction(assetId: string): Promise<void> {
  const session = await requireVendor();
  await deleteAsset(session.userId, assetId);
  revalidatePath("/vendor/profile");
  revalidatePath("/vendor");
}

export async function saveProfileAction(formData: FormData): Promise<void> {
  const session = await requireVendor();
  const data = parseOrThrow(vendorProfileSchema, {
    brandName: formData.get("brandName"),
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    website: formData.get("website") || undefined,
    instagram: formData.get("instagram") || undefined,
  });
  await upsertProfile(session.userId, data);
  revalidatePath("/vendor");
  revalidatePath("/vendor/profile");
}

export async function saveKycAction(formData: FormData): Promise<void> {
  const session = await requireVendor();
  const data = parseOrThrow(vendorKycSchema, {
    pan: formData.get("pan") || undefined,
    fssai: formData.get("fssai") || undefined,
    gstin: formData.get("gstin") || undefined,
  });
  await upsertKyc(session.userId, data);
  revalidatePath("/vendor/profile");
}
