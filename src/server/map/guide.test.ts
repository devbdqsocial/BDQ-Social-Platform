import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  listPublished: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: { event: { findUnique: mocks.eventFindUnique } },
}));
vi.mock("@/server/events/service", () => ({
  listPublished: mocks.listPublished,
}));

import { bucketOf, getEventGuide } from "./guide";

beforeEach(() => vi.clearAllMocks());

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

describe("getEventGuide", () => {
  it("locks layout data without fetching coordinates or layout JSON", async () => {
    mocks.listPublished.mockResolvedValue([{ id: "event_1" }]);
    mocks.eventFindUnique.mockResolvedValue({
      name: "Night Market",
      slug: "night-market",
      location: "Vadodara",
      startsAt: new Date("2026-10-01T12:00:00.000Z"),
      mapLayout: { id: "layout_1" },
      stalls: [
        {
          label: "A1",
          kind: "STALL",
          status: "BOOKED",
          bookings: [
            {
              vendorProfile: {
                id: "vendor_1",
                brandName: "Bake House",
                productCategory: "Bakery",
                category: null,
                description: "Small-batch desserts",
              },
            },
          ],
        },
        { label: "Gate", kind: "INFRA", status: "AVAILABLE", bookings: [] },
      ],
    });

    const guide = await getEventGuide({ includeLayout: false });
    const include = mocks.eventFindUnique.mock.calls[0][0].include;

    expect(include.mapLayout).toEqual({ select: { id: true } });
    expect(include.stalls.select).not.toHaveProperty("xFt");
    expect(include.stalls.select).not.toHaveProperty("yFt");
    expect(guide).toMatchObject({
      hasLayout: true,
      layoutLocked: true,
      layout: null,
      brands: [{ brandName: "Bake House", zone: null }],
      facilities: [{ label: "Gate" }],
    });
  });
});
