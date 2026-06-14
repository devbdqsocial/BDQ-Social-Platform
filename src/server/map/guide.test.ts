import { describe, expect, it } from "vitest";
import { bucketOf } from "./guide";

describe("bucketOf — customer category buckets", () => {
  it("buckets food/drink vendors", () => {
    expect(bucketOf("Bakery")).toBe("Food");
    expect(bucketOf("Coffee & beverages")).toBe("Food");
    expect(bucketOf(null, "Street food")).toBe("Food");
  });

  it("buckets experiences/activities", () => {
    expect(bucketOf("Art workshop")).toBe("Experience");
    expect(bucketOf("Live music")).toBe("Experience");
    expect(bucketOf(null, "Wellness & spa")).toBe("Experience");
  });

  it("defaults everything else to shopping", () => {
    expect(bucketOf("Apparel")).toBe("Shopping");
    expect(bucketOf("Jewellery")).toBe("Shopping");
    expect(bucketOf(null, null)).toBe("Shopping");
  });
});
