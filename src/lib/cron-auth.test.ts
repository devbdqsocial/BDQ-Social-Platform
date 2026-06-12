import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isCronAuthed } from "./cron-auth";

const reqWith = (h: Record<string, string>) => ({ headers: new Headers(h) }) as unknown as Request;
const prev = process.env.CRON_SECRET;

describe("isCronAuthed", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s".repeat(32);
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  });

  it("accepts the correct Bearer token", () => {
    expect(isCronAuthed(reqWith({ authorization: `Bearer ${"s".repeat(32)}` }))).toBe(true);
  });

  it("accepts the correct x-cron-key", () => {
    expect(isCronAuthed(reqWith({ "x-cron-key": "s".repeat(32) }))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    expect(isCronAuthed(reqWith({ authorization: "Bearer nope" }))).toBe(false);
    expect(isCronAuthed(reqWith({}))).toBe(false);
  });

  it("fails closed when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthed(reqWith({ authorization: `Bearer ${"s".repeat(32)}` }))).toBe(false);
  });
});
