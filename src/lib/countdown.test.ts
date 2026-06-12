import { describe, expect, it } from "vitest";
import { timeLeft } from "./countdown";

const now = new Date("2026-10-17T00:00:00Z");

describe("timeLeft", () => {
  it("breaks down the remaining time", () => {
    const target = new Date(now.getTime() + ((2 * 24 + 3) * 60 + 4) * 60_000 + 5_000);
    expect(timeLeft(target, now)).toEqual({ days: 2, hours: 3, mins: 4, secs: 5, done: false });
  });

  it("is done at/after the target", () => {
    expect(timeLeft(now, now).done).toBe(true);
    expect(timeLeft(new Date(now.getTime() - 1000), now).done).toBe(true);
  });
});
