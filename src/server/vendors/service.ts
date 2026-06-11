import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { decryptNullable, encryptNullable } from "@/lib/crypto-field";
import type { VendorKycInput, VendorProfileInput } from "@/server/schemas";
import type { UploadableAssetKind } from "@/lib/assets";

/** Vendor profile + KYC (verify-only, no GST) + Cloudinary assets. */

/** Decrypt the at-rest KYC PII fields for display. Safe on legacy plaintext rows. */
export function decryptKyc<T extends { pan: string | null; fssai: string | null; gstin: string | null }>(
  kyc: T | null | undefined,
): T | null {
  if (!kyc) return kyc ?? null;
  return { ...kyc, pan: decryptNullable(kyc.pan), fssai: decryptNullable(kyc.fssai), gstin: decryptNullable(kyc.gstin) };
}

export async function getProfile(userId: string) {
  const profile = await db.vendorProfile.findUnique({
    where: { userId },
    include: { kyc: true, assets: { orderBy: { createdAt: "desc" } } },
  });
  if (profile?.kyc) profile.kyc = decryptKyc(profile.kyc)!;
  return profile;
}

// ── Public brand directory (read-only, no auth) ───────────────────────────────
// Cached 60s for display; no Date fields are consumed downstream, so no revival needed.
// Vendor-portal reads/mutations and ownership checks query the DB directly.
export const listApprovedVendors = unstable_cache(
  () =>
    db.vendorProfile.findMany({
      where: { approvalStatus: "APPROVED" },
      orderBy: { brandName: "asc" },
      include: { assets: { select: { kind: true, url: true } } },
    }),
  ["vendors:approved"],
  { revalidate: 60, tags: ["vendors"] },
);

export const getApprovedVendor = unstable_cache(
  (id: string) =>
    db.vendorProfile.findFirst({
      where: { id, approvalStatus: "APPROVED" },
      include: { assets: { select: { kind: true, url: true } } },
    }),
  ["vendors:approved-one"],
  { revalidate: 60, tags: ["vendors"] },
);

export async function addAsset(
  userId: string,
  kind: UploadableAssetKind,
  url: string,
  publicId: string,
) {
  const profile = await db.vendorProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new Error("Create your profile first");
  return db.vendorAsset.create({ data: { vendorProfileId: profile.id, kind, url, publicId } });
}

export async function deleteAsset(userId: string, assetId: string) {
  const asset = await db.vendorAsset.findUnique({
    where: { id: assetId },
    include: { vendorProfile: { select: { userId: true } } },
  });
  if (!asset || asset.vendorProfile.userId !== userId) throw new Error("Asset not found");
  await db.vendorAsset.delete({ where: { id: assetId } });
}

export function upsertProfile(userId: string, input: VendorProfileInput) {
  const socials = input.instagram ? { instagram: input.instagram } : Prisma.JsonNull;
  const data = {
    brandName: input.brandName,
    registeredName: input.registeredName || null,
    category: input.category || null,
    productCategory: input.productCategory || null,
    products: input.products || null,
    description: input.description || null,
    website: input.website || null,
    instagram: input.instagram || null,
    contactPerson: input.contactPerson || null,
    whatsapp: input.whatsapp || null,
    city: input.city || null,
    socials, // kept in sync for the public brand page
  };
  return db.vendorProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

/** Store/replace a single KYC document reference in VendorKyc.docUrls (keyed by docType). */
export async function setKycDoc(
  userId: string,
  docType: "pan" | "fssai" | "gst" | "id",
  doc: { url: string; publicId: string } | null,
) {
  const profile = await db.vendorProfile.findUnique({
    where: { userId },
    select: { id: true, kyc: { select: { docUrls: true } } },
  });
  if (!profile) throw new Error("Create your profile first");
  const current = (profile.kyc?.docUrls as Record<string, unknown> | null) ?? {};
  const next: Record<string, unknown> = { ...current };
  if (doc) next[docType] = doc;
  else delete next[docType];
  const docUrls = next as Prisma.InputJsonValue;
  return db.vendorKyc.upsert({
    where: { vendorProfileId: profile.id },
    update: { docUrls },
    create: { vendorProfileId: profile.id, docUrls },
  });
}

export async function upsertKyc(userId: string, input: VendorKycInput) {
  const profile = await db.vendorProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new Error("Create your profile first");
  // Encrypt PII at rest (PAN/GSTIN/FSSAI). docUrls are Cloudinary references, left as-is.
  const data = {
    ...input,
    pan: encryptNullable(input.pan),
    fssai: encryptNullable(input.fssai),
    gstin: encryptNullable(input.gstin),
  };
  return db.vendorKyc.upsert({
    where: { vendorProfileId: profile.id },
    update: data,
    create: { vendorProfileId: profile.id, ...data },
  });
}

/** Right-to-erasure: delete a vendor's KYC record (PII). Audited by the caller. */
export async function deleteKyc(vendorProfileId: string) {
  await db.vendorKyc.deleteMany({ where: { vendorProfileId } });
}
