import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/server/db", () => ({
  db: { event: { findUnique: mocks.eventFindUnique } },
}));

import { deriveReadinessIssues, getBySlug } from "./service";

beforeEach(() => vi.clearAllMocks());

describe("deriveReadinessIssues venue gate", () => {
  const baseEvent = {
    name: "Night Market",
    description: "d",
    location: "Vadodara",
    startsAt: new Date("2026-10-01T12:00:00.000Z"),
    endsAt: new Date("2026-10-01T18:00:00.000Z"),
    capacity: null,
    vendorStallsEnabled: true,
    ticketTypes: [{ priceInPaise: 50000, totalQty: 10, attendeesPer: 1 }],
    mapLayout: { id: "layout_1" },
    stalls: [] as { priceInPaise: number | null; stallType: { priceInPaise: number } | null }[],
  };
  const venueIssue = (e: typeof baseEvent) => deriveReadinessIssues(e).issues.some((i) => i.key === "venue");

  it("accepts a stall priced via its type (matches what checkout charges)", () => {
    expect(venueIssue({ ...baseEvent, stalls: [{ priceInPaise: null, stallType: { priceInPaise: 500000 } }] })).toBe(false);
  });

  it("blocks when no stall has an effective price", () => {
    expect(venueIssue({ ...baseEvent, stalls: [{ priceInPaise: null, stallType: null }] })).toBe(true);
    expect(venueIssue({ ...baseEvent, stalls: [] })).toBe(true);
  });

  it("skips the venue gate entirely when vendor stalls are off", () => {
    expect(venueIssue({ ...baseEvent, vendorStallsEnabled: false, mapLayout: null as unknown as { id: string }, stalls: [] })).toBe(false);
  });
});

describe("getBySlug", () => {
  it("does not select public stall geometry or layout JSON", async () => {
    mocks.eventFindUnique.mockResolvedValue({
      id: "event_1",
      name: "Night Market",
      slug: "night-market",
      status: "PUBLISHED",
      description: null,
      location: "Vadodara",
      startsAt: new Date("2026-10-01T12:00:00.000Z"),
      endsAt: new Date("2026-10-01T18:00:00.000Z"),
      updatedAt: new Date("2026-09-01T12:00:00.000Z"),
      ticketTypes: [],
      schedule: [],
      mapLayout: { id: "layout_1" },
      _count: { stalls: 2 },
    });

    const event = await getBySlug("night-market");
    const include = mocks.eventFindUnique.mock.calls[0][0].include;

    expect(event?._count.stalls).toBe(2);
    expect(include.stalls).toBeUndefined();
    expect(include.mapLayout).toEqual({ select: { id: true } });
  });
});
