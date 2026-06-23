import { describe, it, expect } from "vitest";
import { detectStageConflicts, type ConflictSlot } from "./schedule-conflicts";

const slot = (id: string, stage: string | null, start: string | null, end: string | null): ConflictSlot => ({
  id,
  label: id,
  stageOrZone: stage,
  startsAt: start ? new Date(start) : null,
  endsAt: end ? new Date(end) : null,
});

describe("detectStageConflicts", () => {
  it("flags overlapping items on the same stage", () => {
    const c = detectStageConflicts([
      slot("a", "Main", "2026-10-30T18:00:00+05:30", "2026-10-30T19:00:00+05:30"),
      slot("b", "Main", "2026-10-30T18:30:00+05:30", "2026-10-30T19:30:00+05:30"),
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].stage).toBe("Main");
  });

  it("does not flag back-to-back items (touching edges)", () => {
    const c = detectStageConflicts([
      slot("a", "Main", "2026-10-30T18:00:00+05:30", "2026-10-30T19:00:00+05:30"),
      slot("b", "Main", "2026-10-30T19:00:00+05:30", "2026-10-30T20:00:00+05:30"),
    ]);
    expect(c).toHaveLength(0);
  });

  it("does not flag overlaps on different stages", () => {
    const c = detectStageConflicts([
      slot("a", "Main", "2026-10-30T18:00:00+05:30", "2026-10-30T19:00:00+05:30"),
      slot("b", "Garden", "2026-10-30T18:30:00+05:30", "2026-10-30T19:30:00+05:30"),
    ]);
    expect(c).toHaveLength(0);
  });

  it("ignores items without a stage or start time", () => {
    const c = detectStageConflicts([
      slot("a", null, "2026-10-30T18:00:00+05:30", "2026-10-30T19:00:00+05:30"),
      slot("b", "Main", null, null),
    ]);
    expect(c).toHaveLength(0);
  });
});
