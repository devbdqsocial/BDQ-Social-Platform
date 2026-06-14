import { describe, expect, it } from "vitest";
import { homeFocus } from "./home-content";
import { getHomeMode, type HomeModeEvent } from "./home-mode";

describe("homeFocus per mode", () => {
  it("PRE sells tickets + countdown", () => {
    const f = homeFocus("PRE");
    expect(f.primary.href).toBe("/events");
    expect(f.showCountdown).toBe(true);
    expect(f.closing.action.href).toBe("/events");
  });
  it("LIVE points at what's on (no countdown)", () => {
    const f = homeFocus("LIVE");
    expect(f.primary.href).toBe("/schedule");
    expect(f.secondary.map((s) => s.href)).toEqual(["/map", "/offers"]);
    expect(f.showCountdown).toBe(false);
  });
  it("POST leads to memories", () => {
    const f = homeFocus("POST");
    expect(f.primary.href).toBe("/gallery");
    expect(f.showCountdown).toBe(false);
  });
});

describe("lifecycle flips (clock-mocked, end-to-end)", () => {
  // event: starts 2026-10-01T18:00Z, ends 22:00Z, PUBLISHED. LIVE window = start−6h → end+2h.
  const event: HomeModeEvent = { startsAt: new Date("2026-10-01T18:00:00Z"), endsAt: new Date("2026-10-01T22:00:00Z"), status: "PUBLISHED" };
  const focusAt = (iso: string) => homeFocus(getHomeMode(event, new Date(iso)));

  it("PRE before the live window → tickets", () => {
    expect(focusAt("2026-10-01T06:00:00Z").primary.href).toBe("/events"); // >6h before
  });
  it("LIVE inside the window → what's on", () => {
    expect(focusAt("2026-10-01T19:00:00Z").primary.href).toBe("/schedule");
    expect(focusAt("2026-10-01T13:00:00Z").primary.href).toBe("/schedule"); // exactly start−5h, within −6h
  });
  it("POST after the window → gallery", () => {
    expect(focusAt("2026-10-02T01:00:00Z").primary.href).toBe("/gallery"); // >end+2h
  });
});
