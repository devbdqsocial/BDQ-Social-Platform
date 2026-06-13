/** Shared Indian-locale date/time formatters. All timestamps are Asia/Kolkata. */

const IST = "Asia/Kolkata";

export const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: IST }).format(d);

export const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: IST }).format(d);

export const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: IST }).format(d);

export const fmtDateFull = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: IST }).format(d);

export const fmtDayLabel = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: IST }).format(d);

export const fmtDateLong = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: IST }).format(d);

/** Compact "13 Jun, 02:30 pm" for dense admin lists. */
export const fmtCompact = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: IST }).format(d);
