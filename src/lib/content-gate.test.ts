import { describe, expect, it } from "vitest";
import { galleryReady, GALLERY_MIN_PHOTOS, cleanSections, guideReady, parseGuideSections } from "./content-gate";

describe("galleryReady (≥8 gate)", () => {
  it("hides until the minimum, shows at/above it", () => {
    expect(galleryReady(0)).toBe(false);
    expect(galleryReady(GALLERY_MIN_PHOTOS - 1)).toBe(false);
    expect(galleryReady(GALLERY_MIN_PHOTOS)).toBe(true);
    expect(galleryReady(20)).toBe(true);
  });
});

describe("cleanSections / guideReady (non-empty gate)", () => {
  it("drops sections with no heading or no body", () => {
    const out = cleanSections([
      { heading: "Getting there", body: ["Park at Gate 2", "  "] },
      { heading: "  ", body: ["orphan body"] },
      { heading: "Empty", body: ["", "   "] },
    ]);
    expect(out).toEqual([{ heading: "Getting there", body: ["Park at Gate 2"] }]);
  });

  it("guideReady is false when nothing survives cleaning", () => {
    expect(guideReady([])).toBe(false);
    expect(guideReady([{ heading: "", body: [] }])).toBe(false);
    expect(guideReady([{ heading: "Timings", body: ["Gates 4pm"] }])).toBe(true);
  });
});

describe("parseGuideSections (defensive)", () => {
  it("returns [] for null/garbage/missing", () => {
    expect(parseGuideSections(null)).toEqual([]);
    expect(parseGuideSections("not json")).toEqual([]);
    expect(parseGuideSections('{"nope":1}')).toEqual([]);
  });

  it("parses + cleans valid guide json (string or array body)", () => {
    const json = JSON.stringify({ sections: [
      { heading: "Food & payments", body: ["UPI accepted everywhere", ""] },
      { heading: "House rules", body: "Travel light" },
      { heading: "", body: ["dropped"] },
    ] });
    expect(parseGuideSections(json)).toEqual([
      { heading: "Food & payments", body: ["UPI accepted everywhere"] },
      { heading: "House rules", body: ["Travel light"] },
    ]);
  });
});
