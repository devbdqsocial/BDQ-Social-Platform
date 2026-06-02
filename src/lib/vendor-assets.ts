/** Pure asset pickers for the brand directory. */

export interface VendorAssetLike {
  kind: string;
  url: string;
}

export function primaryLogo(assets: VendorAssetLike[]): string | null {
  return assets.find((a) => a.kind === "LOGO")?.url ?? assets[0]?.url ?? null;
}

export function productImages(assets: VendorAssetLike[]): string[] {
  return assets.filter((a) => a.kind === "PRODUCT").map((a) => a.url);
}
