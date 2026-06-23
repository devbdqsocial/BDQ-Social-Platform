import { describe, it, expect } from "vitest";
import { dayForTime } from "./event-days";

const D = (s: string) => new Date(s);
const days = [
  { id: "d1", startsAt: D("2026-10-30T16:00:00+05:30"), endsAt: D("2026-10-30T23:00:00+05:30") },
  { id: "d2", startsAt: D("2026-10-31T16:00:00+05:30"), endsAt: D("2026-10-31T23:00:00+05:30") },
  { id: "d3", startsAt: D("2026-11-01T16:00:00+05:30"), endsAt: D("2026-11-02T00:30:00+05:30") }, // overnight
];

describe("dayForTime", () => {
  it("matches a time inside a day window", () => {
    expect(dayForTime(days, D("2026-10-30T20:00:00+05:30"))?.id).toBe("d1");
  });

  it("buckets a past-midnight set into its festival day, not the next calendar date", () => {
    expect(dayForTime(days, D("2026-11-02T00:15:00+05:30"))?.id).toBe("d3");
  });

  it("returns null outside every window", () => {
    expect(dayForTime(days, D("2026-10-30T12:00:00+05:30"))).toBeNull();
    expect(dayForTime(days, D("2026-10-31T00:00:00+05:30"))).toBeNull(); // overnight gap between d1 and d2
  });
});
