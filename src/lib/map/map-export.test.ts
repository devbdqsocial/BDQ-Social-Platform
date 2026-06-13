import { describe, expect, it } from "vitest";
import { slugify, exportFilename, scaleBarPoints, fitImageBox } from "./map-export";

describe("slugify + exportFilename", () => {
  it("slugifies messy names", () => {
    expect(slugify("Aarush Lawn — Main!")).toBe("aarush-lawn-main");
    expect(slugify("   ")).toBe("map");
  });

  it("builds the naming convention", () => {
    const d = new Date(2026, 5, 13); // 2026-06-13 (month is 0-based)
    expect(exportFilename("vendor", "Aarush Lawn", d, "pdf")).toBe("bdq-map-aarush-lawn-vendor-20260613.pdf");
    expect(exportFilename("ops", "VIP Zone", d, "png")).toBe("bdq-map-vip-zone-ops-20260613.png");
  });
});

describe("scaleBarPoints", () => {
  it("scales the bar to real feet against the placed image width", () => {
    // 200 ft canvas placed at 600 pt wide → 50 ft = 150 pt
    expect(scaleBarPoints(200, 600, 50)).toBe(150);
    expect(scaleBarPoints(100, 400, 25)).toBe(100);
  });

  it("guards a zero-width canvas", () => {
    expect(scaleBarPoints(0, 600)).toBe(0);
  });
});

describe("fitImageBox", () => {
  it("fits a wide canvas to the box width", () => {
    const r = fitImageBox(200, 100, 600, 600); // aspect 2 → 600×300
    expect(r).toEqual({ width: 600, height: 300 });
  });

  it("fits a tall canvas to the box height", () => {
    const r = fitImageBox(100, 400, 600, 400); // aspect 0.25 → height 400, width 100
    expect(r).toEqual({ width: 100, height: 400 });
  });
});
