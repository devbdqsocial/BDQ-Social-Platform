import { describe, it, expect, beforeAll } from "vitest";
import { encryptField, decryptField, isEncrypted, encryptNullable, decryptNullable } from "./crypto-field";

beforeAll(() => {
  process.env.KYC_ENC_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("crypto-field", () => {
  it("round-trips and does not store plaintext", () => {
    const c = encryptField("ABCDE1234F");
    expect(isEncrypted(c)).toBe(true);
    expect(c).not.toContain("ABCDE1234F");
    expect(decryptField(c)).toBe("ABCDE1234F");
  });

  it("passes through legacy plaintext (pre-backfill)", () => {
    expect(decryptField("PLAINPAN")).toBe("PLAINPAN");
  });

  it("detects tampering via the GCM auth tag", () => {
    const c = encryptField("secret");
    const tampered = c.slice(0, -2) + (c.endsWith("AA") ? "BB" : "AA");
    expect(() => decryptField(tampered)).toThrow();
  });

  it("nullable helpers treat empty/null as null", () => {
    expect(encryptNullable("")).toBeNull();
    expect(encryptNullable(null)).toBeNull();
    expect(decryptNullable(null)).toBeNull();
  });
});
