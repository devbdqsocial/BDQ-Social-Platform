import { describe, it, expect } from "vitest";
import { couponValueToStored } from "./coupon-input";

describe("couponValueToStored", () => {
  it("converts FLAT rupees to paise", () => {
    expect(couponValueToStored("FLAT", 100)).toBe(10000);
    expect(couponValueToStored("FLAT", 49.5)).toBe(4950);
  });

  it("clamps PERCENT to 0..100", () => {
    expect(couponValueToStored("PERCENT", 20)).toBe(20);
    expect(couponValueToStored("PERCENT", 150)).toBe(100);
    expect(couponValueToStored("PERCENT", -5)).toBe(0);
  });
});
