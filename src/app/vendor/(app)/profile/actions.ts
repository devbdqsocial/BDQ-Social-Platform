"use server";

import { revalidatePath } from "next/cache";
import { requireVendor } from "@/server/auth/guard";
import { addAsset, deleteAsset, setKycDoc, upsertKyc, upsertProfile } from "@/server/vendors/service";
import { vendorKycSchema, vendorProfileSchema } from "@/server/schemas";
import { signUpload, type UploadSignature } from "@/lib/cloudinary";
import { isAllowedAssetKind } from "@/lib/assets";
import { parseOrThrow } from "@/lib/validation";

const KYC_DOC_TYPES = ["pan", "fssai", "gst", "id"] as const;
type KycDocType = (typeof KYC_DOC_TYPES)[number];
const isKycDocType = (t: string): t is KycDocType => (KYC_DOC_TYPES as readonly string[]).includes(t);

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
  const g = (k: string) => (formData.get(k) || undefined) as string | undefined;
  const data = parseOrThrow(vendorProfileSchema, {
    brandName: formData.get("brandName"),
    registeredName: g("registeredName"),
    category: g("category"),
    productCategory: g("productCategory"),
    products: g("products"),
    description: g("description"),
    website: g("website"),
    instagram: g("instagram"),
    contactPerson: g("contactPerson"),
    whatsapp: g("whatsapp"),
    city: g("city"),
  });
  await upsertProfile(session.userId, data);
  revalidatePath("/vendor");
  revalidatePath("/vendor/profile");
  revalidatePath("/vendor/onboarding");
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
  revalidatePath("/vendor/onboarding");
}

// ── KYC document uploads (PAN card, FSSAI, GST cert, govt ID) ──────────────────
export async function getKycUploadSignatureAction(docType: string): Promise<UploadSignature> {
  await requireVendor();
  if (!isKycDocType(docType)) throw new Error("Invalid document type");
  return signUpload(`bdq/vendors/kyc/${docType}`);
}

export async function saveKycDocAction(docType: string, url: string, publicId: string): Promise<void> {
  const session = await requireVendor();
  if (!isKycDocType(docType)) throw new Error("Invalid document type");
  await setKycDoc(session.userId, docType, { url, publicId });
  revalidatePath("/vendor/profile");
  revalidatePath("/vendor/onboarding");
  revalidatePath("/vendor/documents");
}

export async function deleteKycDocAction(docType: string): Promise<void> {
  const session = await requireVendor();
  if (!isKycDocType(docType)) throw new Error("Invalid document type");
  await setKycDoc(session.userId, docType, null);
  revalidatePath("/vendor/profile");
  revalidatePath("/vendor/onboarding");
}
