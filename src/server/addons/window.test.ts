import { describe, expect, it } from "vitest";
import { addOnOrdersOpen } from "./service";

/** Add-on ordering closes `closeHours` (default 48) before the event (vendor-portal §5). */
describe("addOnOrdersOpen", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("open when the event is more than 48h away", () => {
    expect(addOnOrdersOpen(new Date("2026-06-17T13:00:00Z"), 48, now)).toBe(true); // 49h
  });

  it("closed inside the 48h window", () => {
    expect(addOnOrdersOpen(new Date("2026-06-17T11:00:00Z"), 48, now)).toBe(false); // 47h
  });

  it("closed exactly at the 48h boundary", () => {
    expect(addOnOrdersOpen(new Date("2026-06-17T12:00:00Z"), 48, now)).toBe(false); // 48h
  });

  it("closed once the event has started", () => {
    expect(addOnOrdersOpen(new Date("2026-06-14T12:00:00Z"), 48, now)).toBe(false);
  });

  it("honours a custom close window", () => {
    // 49h away: open at the default 48h, but closed when the window is widened to 72h.
    expect(addOnOrdersOpen(new Date("2026-06-17T13:00:00Z"), 72, now)).toBe(false);
    expect(addOnOrdersOpen(new Date("2026-06-17T13:00:00Z"), 24, now)).toBe(true);
  });
});
