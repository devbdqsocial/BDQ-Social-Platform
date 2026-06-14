import { describe, expect, it } from "vitest";
import { itemPhase, groupByDay, stagesOf, dayKey, SOON_MS } from "./schedule";
import type { ScheduleSlot } from "./home-mode";

const slot = (id: string, startsAt: string, opts: Partial<ScheduleSlot> = {}): ScheduleSlot => ({
  id, title: id, startsAt: new Date(startsAt), endsAt: null, stageOrZone: null, performer: null, ...opts,
});

const NOW = new Date("2026-10-01T18:00:00Z");

describe("itemPhase (time-mocked now-line)", () => {
  it("done after the end (open-ended = +45m)", () => {
    expect(itemPhase(slot("a", "2026-10-01T17:00:00Z"), NOW)).toBe("done"); // ended 17:45
  });
  it("live while running", () => {
    expect(itemPhase(slot("b", "2026-10-01T17:45:00Z", { endsAt: new Date("2026-10-01T18:30:00Z") }), NOW)).toBe("live");
    expect(itemPhase(slot("c", "2026-10-01T18:00:00Z"), NOW)).toBe("live"); // starts exactly now
  });
  it("soon within the window, upcoming beyond it", () => {
    expect(itemPhase(slot("d", new Date(NOW.getTime() + SOON_MS - 1000).toISOString()), NOW)).toBe("soon");
    expect(itemPhase(slot("e", new Date(NOW.getTime() + SOON_MS + 60_000).toISOString()), NOW)).toBe("upcoming");
  });
});

describe("groupByDay", () => {
  it("splits items across local days, preserving order", () => {
    // midday UTC + 2 days apart → distinct local days in any reasonable timezone
    const days = groupByDay([
      slot("a", "2026-10-01T12:00:00Z"),
      slot("b", "2026-10-01T14:00:00Z"),
      slot("c", "2026-10-03T12:00:00Z"),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(days[1].items.map((i) => i.id)).toEqual(["c"]);
    expect(days[0].key).toBe(dayKey(new Date("2026-10-01T12:00:00Z")));
  });
});

describe("stagesOf", () => {
  it("returns distinct stages in first-seen order, ignoring blanks", () => {
    expect(stagesOf([
      slot("a", "2026-10-01T18:00:00Z", { stageOrZone: "Main Stage" }),
      slot("b", "2026-10-01T18:30:00Z", { stageOrZone: "Food Court" }),
      slot("c", "2026-10-01T19:00:00Z", { stageOrZone: "Main Stage" }),
      slot("d", "2026-10-01T19:30:00Z", { stageOrZone: null }),
    ])).toEqual(["Main Stage", "Food Court"]);
  });
});
