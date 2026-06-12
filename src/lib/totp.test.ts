import { describe, expect, it } from "vitest";
import { currentCode, generateSecret, otpauthUrl, verifyCode } from "./totp";

describe("totp", () => {
  it("verifies a current code", () => {
    const secret = generateSecret();
    expect(verifyCode(currentCode(secret), secret)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const secret = generateSecret();
    expect(verifyCode("000000", secret) && verifyCode("123456", secret)).toBe(false);
  });

  it("builds an otpauth url with issuer + account", () => {
    const url = otpauthUrl("admin@bdqsocial.com", generateSecret());
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain("BDQSocial");
  });
});
