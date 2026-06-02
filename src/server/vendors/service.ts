import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import type { VendorKycInput, VendorProfileInput } from "@/server/schemas";
import type { UploadableAssetKind } from "@/lib/assets";

/** Vendor profile + KYC (verify-only, no GST) + Cloudinary assets. */

export function getProfile(userId: string) {
  return db.vendorProfile.findUnique({
    where: { userId },
    include: { kyc: true, assets: { orderBy: { createdAt: "desc" } } },
  });
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
  return db.vendorKyc.upsert({
    where: { vendorProfileId: profile.id },
    update: input,
    create: { vendorProfileId: profile.id, ...input },
  });
}
