import { describe, expect, it } from "vitest";
import { getHomeMode, resolveNowNext, DEFAULT_ITEM_MS, type ScheduleSlot } from "./home-mode";

// Event timed in IST terms: gates 16:00 IST (10:30 UTC), ends 23:00 IST (17:30 UTC).
const ev = (status = "PUBLISHED") => ({
  startsAt: new Date("2026-10-17T10:30:00.000Z"),
  endsAt: new Date("2026-10-17T17:30:00.000Z"),
  status,
});
const at = (iso: string) => new Date(iso);

describe("getHomeMode", () => {
  it("defaults to PRE with no event and well before the event", () => {
    expect(getHomeMode(null)).toBe("PRE");
    expect(getHomeMode(ev(), at("2026-10-01T12:00:00Z"))).toBe("PRE");
  });

  it("flips to LIVE exactly at startsAt − 6h and back edge at endsAt + 2h", () => {
    expect(getHomeMode(ev(), at("2026-10-17T04:29:59Z"))).toBe("PRE");
    expect(getHomeMode(ev(), at("2026-10-17T04:30:00Z"))).toBe("LIVE");
    expect(getHomeMode(ev(), at("2026-10-17T15:00:00Z"))).toBe("LIVE"); // mid-event
    expect(getHomeMode(ev(), at("2026-10-17T19:29:59Z"))).toBe("LIVE");
    expect(getHomeMode(ev(), at("2026-10-17T19:30:00Z"))).toBe("POST");
  });

  it("POST lasts 14 days then returns to PRE", () => {
    expect(getHomeMode(ev(), at("2026-10-25T12:00:00Z"))).toBe("POST");
    expect(getHomeMode(ev(), at("2026-10-31T19:30:00Z"))).toBe("PRE");
  });

  it("DRAFT/ENDED events never go LIVE but still get POST after the window", () => {
    expect(getHomeMode(ev("DRAFT"), at("2026-10-17T15:00:00Z"))).toBe("PRE");
    expect(getHomeMode(ev("ENDED"), at("2026-10-18T12:00:00Z"))).toBe("POST");
  });
});

const slot = (id: string, startIso: string, opts: Partial<ScheduleSlot> = {}): ScheduleSlot => ({
  id,
  title: id,
  startsAt: new Date(startIso),
  endsAt: null,
  stageOrZone: "Main",
  performer: null,
  ...opts,
});

describe("resolveNowNext", () => {
  const t = at("2026-10-17T14:00:00Z");

  it("open-ended items run 45 minutes", () => {
    const a = slot("a", "2026-10-17T13:30:00Z"); // 13:30 + 45m = 14:15 → running
    const b = slot("b", "2026-10-17T13:00:00Z"); // ended 13:45
    expect(resolveNowNext([b, a], t).now.map((s) => s.id)).toEqual(["a"]);
    expect(new Date(a.startsAt.getTime() + DEFAULT_ITEM_MS).toISOString()).toBe("2026-10-17T14:15:00.000Z");
  });

  it("explicit endsAt wins over the default duration", () => {
    const long = slot("long", "2026-10-17T12:00:00Z", { endsAt: new Date("2026-10-17T15:00:00Z") });
    expect(resolveNowNext([long], t).now.map((s) => s.id)).toEqual(["long"]);
  });

  it("next = first upcoming item per stage, ordered by start", () => {
    const items = [
      slot("now-main", "2026-10-17T13:45:00Z"),
      slot("next-food", "2026-10-17T14:30:00Z", { stageOrZone: "Food Court" }),
      slot("next-main-1", "2026-10-17T14:20:00Z"),
      slot("next-main-2", "2026-10-17T15:00:00Z"),
    ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const r = resolveNowNext(items, t);
    expect(r.now.map((s) => s.id)).toEqual(["now-main"]);
    expect(r.next.map((s) => s.id)).toEqual(["next-main-1", "next-food"]);
  });

  it("boundary: an item starting exactly now is 'now', not 'next'", () => {
    const exact = slot("exact", "2026-10-17T14:00:00Z");
    const r = resolveNowNext([exact], t);
    expect(r.now.map((s) => s.id)).toEqual(["exact"]);
    expect(r.next).toEqual([]);
  });
});
