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
