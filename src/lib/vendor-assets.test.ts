import { describe, expect, it } from "vitest";
import { primaryLogo, productImages } from "./vendor-assets";

describe("vendor assets", () => {
  it("prefers a LOGO, falls back to first, else null", () => {
    expect(primaryLogo([{ kind: "PRODUCT", url: "p" }, { kind: "LOGO", url: "l" }])).toBe("l");
    expect(primaryLogo([{ kind: "PRODUCT", url: "p" }])).toBe("p");
    expect(primaryLogo([])).toBeNull();
  });

  it("collects product images", () => {
    expect(productImages([{ kind: "LOGO", url: "l" }, { kind: "PRODUCT", url: "a" }, { kind: "PRODUCT", url: "b" }])).toEqual(["a", "b"]);
  });
});
