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

import { getBySlug } from "./service";

beforeEach(() => vi.clearAllMocks());

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
