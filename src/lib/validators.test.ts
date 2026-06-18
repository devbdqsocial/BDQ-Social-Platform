import { describe, it, expect } from "vitest";
import {
  phone10,
  phoneE164,
  phoneE164Optional,
  normalizePhone,
  email,
  emailOptional,
  otp6,
  totp6,
  pan,
  gstin,
  fssai,
  couponCode,
  pincode,
  rupeesToPaise,
  pricePaise,
  quantity,
  percent,
  onlyDigits,
  capLen,
  toUpper,
  digitsCapped,
  validateValue,
  validateForm,
  MAX_PAISE,
} from "./validators";
import { z } from "zod";

const ok = (s: z.ZodTypeAny, v: unknown) => s.safeParse(v).success;
const out = (s: z.ZodTypeAny, v: unknown) => s.safeParse(v).data;

describe("phone (10-digit Indian → E.164)", () => {
  it("accepts a valid 10-digit number", () => {
    expect(ok(phone10, "9876543210")).toBe(true);
    expect(out(phoneE164, "9876543210")).toBe("+919876543210");
  });
  it("strips a leading 0", () => {
    expect(out(phoneE164, "09876543210")).toBe("+919876543210");
  });
  it("strips spaces/dashes before validating", () => {
    expect(out(phoneE164, "98765 43210")).toBe("+919876543210");
    expect(out(phone10, "987-654-3210")).toBe("9876543210");
  });
  it("REJECTS more than 10 digits", () => {
    expect(ok(phone10, "98765432109")).toBe(false);
    expect(ok(phoneE164, "98765432109")).toBe(false);
  });
  it("rejects fewer than 10 digits", () => {
    expect(ok(phone10, "12345")).toBe(false);
  });
  it("rejects a first digit below 6", () => {
    expect(ok(phone10, "5876543210")).toBe(false);
    expect(ok(phone10, "0987654321")).toBe(false);
  });
  it("rejects letters and empty", () => {
    expect(ok(phone10, "abcdefghij")).toBe(false);
    expect(ok(phone10, "")).toBe(false);
  });
  it("optional phone: blank → undefined, valid → E.164, invalid → error", () => {
    expect(out(phoneE164Optional, "")).toBeUndefined();
    expect(out(phoneE164Optional, "9876543210")).toBe("+919876543210");
    expect(ok(phoneE164Optional, "123")).toBe(false);
  });
  it("normalizePhone helper", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
    expect(normalizePhone("+919876543210")).toBe("+919876543210");
    expect(normalizePhone("919876543210")).toBe("+919876543210");
  });
});

describe("email", () => {
  it("accepts + lowercases + trims", () => {
    expect(out(email, "  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
  it("rejects malformed", () => {
    for (const bad of ["a@", "a@b", "nope", "a b@c.com", ""]) expect(ok(email, bad)).toBe(false);
  });
  it("rejects over-long", () => {
    expect(ok(email, "x".repeat(160) + "@a.com")).toBe(false);
  });
  it("optional email: blank → undefined", () => {
    expect(out(emailOptional, "")).toBeUndefined();
    expect(out(emailOptional, "A@B.com")).toBe("a@b.com");
  });
});

describe("OTP / TOTP (exactly 6 digits)", () => {
  it("accepts 6 digits", () => {
    expect(out(otp6, "123456")).toBe("123456");
    expect(ok(totp6, "000000")).toBe(true);
  });
  it("rejects 5 / 7 / non-digit", () => {
    expect(ok(otp6, "12345")).toBe(false);
    expect(ok(otp6, "1234567")).toBe(false);
    expect(ok(otp6, "12a456")).toBe(false);
  });
});

describe("KYC identifiers", () => {
  it("PAN canonical + uppercases", () => {
    expect(ok(pan, "ABCDE1234F")).toBe(true);
    expect(out(pan, "abcde1234f")).toBe("ABCDE1234F");
    expect(ok(pan, "ABCDE1234")).toBe(false);
    expect(ok(pan, "ABCD12345F")).toBe(false);
  });
  it("GSTIN 15-char canonical", () => {
    expect(ok(gstin, "22ABCDE1234F1Z5")).toBe(true);
    expect(ok(gstin, "22ABCDE1234F1Z")).toBe(false);
    expect(ok(gstin, "ABCDE1234F1Z500")).toBe(false);
  });
  it("FSSAI 14 digits", () => {
    expect(ok(fssai, "12345678901234")).toBe(true);
    expect(ok(fssai, "1234567890123")).toBe(false);
    expect(ok(fssai, "1234567890123A")).toBe(false);
  });
});

describe("codes", () => {
  it("coupon code 3-20 alnum, uppercased", () => {
    expect(out(couponCode, "diwali10")).toBe("DIWALI10");
    expect(ok(couponCode, "AB")).toBe(false);
    expect(ok(couponCode, "X".repeat(21))).toBe(false);
    expect(ok(couponCode, "BAD CODE")).toBe(false);
  });
  it("pincode 6 digits", () => {
    expect(ok(pincode, "390001")).toBe(true);
    expect(ok(pincode, "39001")).toBe(false);
  });
});

describe("money / quantity", () => {
  it("rupees → integer paise, bounded", () => {
    expect(out(rupeesToPaise, "899")).toBe(89900);
    expect(out(rupeesToPaise, "12.50")).toBe(1250);
    expect(ok(rupeesToPaise, "-5")).toBe(false);
    expect(ok(rupeesToPaise, String(MAX_PAISE / 100 + 1))).toBe(false);
  });
  it("pricePaise rejects fractional / negative / overflow", () => {
    expect(ok(pricePaise, 50000)).toBe(true);
    expect(ok(pricePaise, 1.5)).toBe(false);
    expect(ok(pricePaise, -1)).toBe(false);
    expect(ok(pricePaise, MAX_PAISE + 1)).toBe(false);
  });
  it("quantity + percent bounds", () => {
    expect(ok(quantity(10), 5)).toBe(true);
    expect(ok(quantity(10), 0)).toBe(false);
    expect(ok(quantity(10), 11)).toBe(false);
    expect(ok(percent, 100)).toBe(true);
    expect(ok(percent, 101)).toBe(false);
  });
});

describe("sanitizers", () => {
  it("onlyDigits / digitsCapped / capLen / toUpper", () => {
    expect(onlyDigits("9a8b7c")).toBe("987");
    expect(digitsCapped(10)("98765432101234")).toBe("9876543210");
    expect(capLen(6)("1234567890")).toBe("123456");
    expect(toUpper("abcDEF")).toBe("ABCDEF");
  });
});

describe("pure validation core", () => {
  it("validateValue returns null when valid, message when invalid", () => {
    expect(validateValue(phone10, "9876543210")).toBeNull();
    expect(validateValue(phone10, "123")).toMatch(/10-digit/);
  });
  it("validateForm returns a per-field error map", () => {
    const schema = z.object({ phone: phone10, email });
    const errs = validateForm(schema, { phone: "123", email: "nope" });
    expect(errs.phone).toMatch(/10-digit/);
    expect(errs.email).toMatch(/valid email/);
    expect(validateForm(schema, { phone: "9876543210", email: "a@b.com" })).toEqual({});
  });
});
