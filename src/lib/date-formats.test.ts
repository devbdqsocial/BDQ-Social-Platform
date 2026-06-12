import { describe, it, expect } from "vitest";
import { fmtDate, fmtDateTime, fmtTime } from "./date-formats";

const D = new Date("2025-12-25T14:30:00Z"); // 25 Dec 2025, 20:00 IST

describe("date-formats", () => {
  it("fmtDate returns a medium date string", () => {
    expect(fmtDate(D)).toMatch(/25/);
    expect(fmtDate(D)).toMatch(/Dec/i);
  });

  it("fmtTime returns a time string", () => {
    const t = fmtTime(D);
    expect(typeof t).toBe("string");
    expect(t.length).toBeGreaterThan(3);
  });

  it("fmtDateTime combines date and time", () => {
    const dt = fmtDateTime(D);
    expect(dt).toMatch(/Dec/i);
    expect(dt.length).toBeGreaterThan(10);
  });
});
