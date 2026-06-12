import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseOrThrow } from "./validation";

describe("parseOrThrow", () => {
  it("returns parsed data on valid input", () => {
    const schema = z.object({ name: z.string().min(1) });
    expect(parseOrThrow(schema, { name: "Test" })).toEqual({ name: "Test" });
  });

  it("throws an Error with the first issue message on invalid input", () => {
    const schema = z.object({ name: z.string().min(3, "Too short") });
    expect(() => parseOrThrow(schema, { name: "Hi" })).toThrow("Too short");
  });

  it("falls back to 'Invalid input' when no message", () => {
    const schema = z.object({ n: z.number() });
    expect(() => parseOrThrow(schema, {})).toThrow(/invalid/i);
  });
});
