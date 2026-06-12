import { describe, expect, it } from "vitest";
import { nextWindow } from "./rate-window";

const now = new Date("2026-10-17T16:00:00Z");

describe("nextWindow", () => {
  it("starts a fresh window when no row", () => {
    const r = nextWindow(null, now, 5, 60_000);
    expect(r).toMatchObject({ allowed: true, reset: true, count: 1 });
  });

  it("resets an expired window", () => {
    const r = nextWindow({ count: 99, resetAt: new Date(now.getTime() - 1) }, now, 5, 60_000);
    expect(r).toMatchObject({ allowed: true, reset: true, count: 1 });
  });

  it("increments within the window", () => {
    const r = nextWindow({ count: 2, resetAt: new Date(now.getTime() + 30_000) }, now, 5, 60_000);
    expect(r).toMatchObject({ allowed: true, reset: false, count: 3 });
  });

  it("blocks at the max", () => {
    const r = nextWindow({ count: 5, resetAt: new Date(now.getTime() + 30_000) }, now, 5, 60_000);
    expect(r.allowed).toBe(false);
  });
});
