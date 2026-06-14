import { describe, expect, it } from "vitest";
import { offerPhase, canRedeem, validityLabel } from "./offer";

const NOW = new Date("2026-10-01T18:00:00Z");
const at = (iso: string) => new Date(iso);

describe("offerPhase (publish→appears, ended→greys)", () => {
  it("live within the window when PUBLISHED", () => {
    expect(offerPhase({ startsAt: at("2026-10-01T16:00:00Z"), endsAt: at("2026-10-01T23:00:00Z"), status: "PUBLISHED" }, NOW)).toBe("live");
  });
  it("upcoming before the start", () => {
    expect(offerPhase({ startsAt: at("2026-10-01T20:00:00Z"), endsAt: at("2026-10-01T23:00:00Z"), status: "PUBLISHED" }, NOW)).toBe("upcoming");
  });
  it("ended past endsAt even if status still PUBLISHED", () => {
    expect(offerPhase({ startsAt: at("2026-10-01T10:00:00Z"), endsAt: at("2026-10-01T17:00:00Z"), status: "PUBLISHED" }, NOW)).toBe("ended");
  });
  it("ended when status is ENDED regardless of time", () => {
    expect(offerPhase({ startsAt: at("2026-10-01T16:00:00Z"), endsAt: at("2026-10-01T23:00:00Z"), status: "ENDED" }, NOW)).toBe("ended");
  });
});

describe("canRedeem", () => {
  it("unlimited when max is null; capped otherwise", () => {
    expect(canRedeem(null, 999)).toBe(true);
    expect(canRedeem(100, 99)).toBe(true);
    expect(canRedeem(100, 100)).toBe(false);
  });
});

describe("validityLabel", () => {
  it("'Tonight only' when it ends today, else a date", () => {
    // build both on the same LOCAL calendar day so the assertion holds in any timezone
    const noonLocal = new Date(2026, 9, 1, 12, 0);
    const elevenLocal = new Date(2026, 9, 1, 23, 0);
    const threeDaysOn = new Date(2026, 9, 4, 20, 0);
    expect(validityLabel(elevenLocal, noonLocal)).toBe("Tonight only");
    expect(validityLabel(threeDaysOn, noonLocal)).toMatch(/^Until /);
  });
});
