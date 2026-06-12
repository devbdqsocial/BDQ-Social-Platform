import { describe, expect, it } from "vitest";
import { HOLD_TTL_MS, holdExpiry, isHoldExpired } from "./booking-time";
import { STALL_TRANSITIONS, canTransition } from "@/server/state/transitions";

describe("hold timing", () => {
  it("holdExpiry is now + 10 min", () => {
    const now = new Date("2026-10-17T16:00:00Z");
    expect(holdExpiry(now).getTime()).toBe(now.getTime() + HOLD_TTL_MS);
  });

  it("isHoldExpired", () => {
    const now = new Date("2026-10-17T16:00:00Z");
    expect(isHoldExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isHoldExpired(new Date(now.getTime() + 1000), now)).toBe(false);
    expect(isHoldExpired(null, now)).toBe(true);
  });

  it("AVAILABLE→HELD is a legal stall transition", () => {
    expect(canTransition(STALL_TRANSITIONS, "AVAILABLE", "HELD")).toBe(true);
    expect(canTransition(STALL_TRANSITIONS, "BOOKED", "HELD")).toBe(false);
  });
});
