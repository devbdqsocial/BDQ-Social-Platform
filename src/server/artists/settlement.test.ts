import { describe, it, expect } from "vitest";
import { deriveSettlement } from "./settlement";

describe("deriveSettlement", () => {
  it("nothing paid → UNPAID", () => {
    expect(deriveSettlement(50000, 0)).toBe("UNPAID");
    expect(deriveSettlement(0, 0)).toBe("UNPAID");
  });
  it("paid below the agreed fee → PARTIAL", () => {
    expect(deriveSettlement(50000, 20000)).toBe("PARTIAL");
  });
  it("paid meets or exceeds the agreed fee → PAID", () => {
    expect(deriveSettlement(50000, 50000)).toBe("PAID");
    expect(deriveSettlement(50000, 60000)).toBe("PAID");
  });
  it("payout with no agreed fee stays PARTIAL (can't be 'fully' paid)", () => {
    expect(deriveSettlement(0, 10000)).toBe("PARTIAL");
  });
});
