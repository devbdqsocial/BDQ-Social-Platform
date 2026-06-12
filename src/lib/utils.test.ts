import { describe, it, expect } from "vitest";
import { parseSkip } from "./utils";

describe("parseSkip", () => {
  it("parses positive integers", () => {
    expect(parseSkip("5")).toBe(5);
    expect(parseSkip("2.9")).toBe(2);
  });

  it("clamps null, negatives, and non-numbers to 0", () => {
    expect(parseSkip(null)).toBe(0);
    expect(parseSkip("0")).toBe(0);
    expect(parseSkip("-3")).toBe(0);
    expect(parseSkip("abc")).toBe(0);
  });
});
