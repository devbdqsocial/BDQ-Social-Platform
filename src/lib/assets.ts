/** Pure asset constraints (shared client + server). */

export const ASSET_KINDS = ["LOGO", "BANNER", "PRODUCT"] as const;
export type UploadableAssetKind = (typeof ASSET_KINDS)[number];

export const MAX_ASSET_BYTES = 5 * 1024 * 1024; // 5 MB

export function isAllowedAssetKind(k: string): k is UploadableAssetKind {
  return (ASSET_KINDS as readonly string[]).includes(k);
}

export function isAllowedImage(type: string, size: number): boolean {
  return type.startsWith("image/") && size > 0 && size <= MAX_ASSET_BYTES;
}
