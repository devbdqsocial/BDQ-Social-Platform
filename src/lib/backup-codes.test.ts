import { describe, expect, it } from "vitest";
import { generateBackupCodes, hashBackupCode, consumeBackupCode } from "./backup-codes";

describe("backup codes", () => {
  it("generates n codes with matching hashes, plaintext never stored", () => {
    const { plain, hashes } = generateBackupCodes(10);
    expect(plain).toHaveLength(10);
    expect(hashes).toHaveLength(10);
    expect(new Set(plain).size).toBe(10); // unique
    plain.forEach((code, i) => expect(hashBackupCode(code)).toBe(hashes[i]));
    expect(hashes).not.toContain(plain[0]); // hash != plaintext
  });

  it("normalises input: case, dashes, and spaces are ignored", () => {
    const { plain } = generateBackupCodes(1);
    const code = plain[0]; // e.g. "abcd-1234"
    const stored = [hashBackupCode(code)];
    expect(consumeBackupCode(stored, code.toUpperCase())).not.toBeNull();
    expect(consumeBackupCode(stored, code.replace("-", ""))).not.toBeNull();
    expect(consumeBackupCode(stored, ` ${code} `)).not.toBeNull();
  });

  it("consumes a code exactly once (single-use)", () => {
    const { plain, hashes } = generateBackupCodes(3);
    const remaining = consumeBackupCode(hashes, plain[1]);
    expect(remaining).not.toBeNull();
    expect(remaining).toHaveLength(2);
    // the same code no longer matches the reduced set
    expect(consumeBackupCode(remaining!, plain[1])).toBeNull();
    // other codes still work
    expect(consumeBackupCode(remaining!, plain[0])).toHaveLength(1);
  });

  it("rejects an unknown code", () => {
    const { hashes } = generateBackupCodes(5);
    expect(consumeBackupCode(hashes, "0000-0000")).toBeNull();
  });
});
