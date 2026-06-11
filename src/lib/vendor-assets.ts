/** Pure asset pickers for the brand directory. Cloudinary delivery transforms applied here
 *  so every public render site gets f_auto,q_auto without repeating it. */
import { cld } from "@/lib/cloudinary-url";

export interface VendorAssetLike {
  kind: string;
  url: string;
}

export function primaryLogo(assets: VendorAssetLike[]): string | null {
  const url = assets.find((a) => a.kind === "LOGO")?.url ?? assets[0]?.url ?? null;
  return url ? cld(url) : null;
}

export function productImages(assets: VendorAssetLike[]): string[] {
  return assets.filter((a) => a.kind === "PRODUCT").map((a) => cld(a.url));
}
