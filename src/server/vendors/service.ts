import "server-only";
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
export function listApprovedVendors() {
  return db.vendorProfile.findMany({
    where: { approvalStatus: "APPROVED" },
    orderBy: { brandName: "asc" },
    include: { assets: { select: { kind: true, url: true } } },
  });
}

export function getApprovedVendor(id: string) {
  return db.vendorProfile.findFirst({
    where: { id, approvalStatus: "APPROVED" },
    include: { assets: { select: { kind: true, url: true } } },
  });
}

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
    category: input.category || null,
    description: input.description || null,
    website: input.website || null,
    socials,
  };
  return db.vendorProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
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
