import { describe, expect, it } from "vitest";
import { classifyScan } from "./checkin";

describe("classifyScan", () => {
  it("maps ticket status to a scan result", () => {
    expect(classifyScan("VALID")).toBe("VALID");
    expect(classifyScan("CHECKED_IN")).toBe("ALREADY_USED");
    expect(classifyScan("CANCELLED")).toBe("INVALID");
    expect(classifyScan(null)).toBe("INVALID");
    expect(classifyScan(undefined)).toBe("INVALID");
  });
});
