import { describe, expect, it } from "vitest";
import { buildIcs, icsHref } from "./ics";

const base = { uid: "tkt_123", title: "BDQ Live", start: new Date("2026-10-01T12:30:00Z") };

describe("buildIcs", () => {
  it("wraps a single VEVENT with the required fields", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:tkt_123");
    expect(ics).toContain("SUMMARY:BDQ Live");
    expect(ics).toContain("DTSTART:20261001T123000Z");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toMatch(/\r\n/); // CRLF line endings
  });

  it("defaults the end to start + 4h", () => {
    expect(buildIcs(base)).toContain("DTEND:20261001T163000Z");
  });

  it("honours an explicit end and optional location/url", () => {
    const ics = buildIcs({ ...base, end: new Date("2026-10-01T22:00:00Z"), location: "Aarush Lawn, Vadodara", url: "https://bdq/e" });
    expect(ics).toContain("DTEND:20261001T220000Z");
    expect(ics).toContain("LOCATION:Aarush Lawn\\, Vadodara"); // comma escaped
    expect(ics).toContain("URL:https://bdq/e");
  });

  it("escapes TEXT special chars (\\ ; , newline)", () => {
    const ics = buildIcs({ ...base, title: "A; B, C\nD" });
    expect(ics).toContain("SUMMARY:A\\; B\\, C\\nD");
  });
});

describe("icsHref", () => {
  it("produces a downloadable data: URI", () => {
    const href = icsHref(base);
    expect(href.startsWith("data:text/calendar;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(href)).toContain("SUMMARY:BDQ Live");
  });
});
