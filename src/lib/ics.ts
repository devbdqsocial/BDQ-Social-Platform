/**
 * Minimal iCalendar (.ics) builder for "Add to calendar" (customer-portal / delight, R3.4).
 * Pure + DB-free. RFC 5545 essentials only — enough for Apple/Google/Outlook to import a single
 * timed event. No external dep.
 */

export interface IcsEvent {
  uid: string;
  title: string;
  start: Date;
  end?: Date; // defaults to start + 4h
  location?: string;
  description?: string;
  url?: string;
}

/** UTC basic format: YYYYMMDDTHHMMSSZ */
const stamp = (d: Date): string => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escape TEXT values per RFC 5545 (backslash, semicolon, comma, newline). */
const esc = (s: string): string => s.replace(/([\\;,])/g, "\\$1").replace(/\r?\n/g, "\\n");

export function buildIcs(e: IcsEvent): string {
  const end = e.end ?? new Date(e.start.getTime() + 4 * 3_600_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BDQ Social//Tickets//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** A data: URI an <a download> can point at — no server round-trip. */
export function icsHref(e: IcsEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(e))}`;
}
