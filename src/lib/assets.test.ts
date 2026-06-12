import { describe, expect, it } from "vitest";
import { MAX_ASSET_BYTES, isAllowedAssetKind, isAllowedImage } from "./assets";

describe("asset constraints", () => {
  it("allows known kinds only", () => {
    expect(isAllowedAssetKind("LOGO")).toBe(true);
    expect(isAllowedAssetKind("PRODUCT")).toBe(true);
    expect(isAllowedAssetKind("KYC_DOC")).toBe(false);
    expect(isAllowedAssetKind("nope")).toBe(false);
  });

  it("allows images within the size limit", () => {
    expect(isAllowedImage("image/png", 1000)).toBe(true);
    expect(isAllowedImage("image/png", MAX_ASSET_BYTES + 1)).toBe(false);
    expect(isAllowedImage("application/pdf", 1000)).toBe(false);
    expect(isAllowedImage("image/png", 0)).toBe(false);
  });
});
