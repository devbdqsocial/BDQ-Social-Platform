import { randomBytes, createHash, timingSafeEqual } from "crypto";

/**
 * One-time backup (recovery) codes for admin 2FA lockout recovery. We store only SHA-256 hashes; the
 * plaintext is shown to the user exactly once at generation. A code is single-use: consuming it removes
 * its hash from the stored set. Codes are high-entropy and login is rate-limited, so SHA-256 is sufficient.
 */

const COUNT = 10;

/** Normalise user input so "ABCD-1234", "abcd 1234" and "abcd1234" all match the stored hash. */
function normalise(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalise(code)).digest("hex");
}

/** Generate `n` codes. Returns the plaintext (show once) and the hashes (store on the user). */
export function generateBackupCodes(n: number = COUNT): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < n; i++) {
    const hex = randomBytes(4).toString("hex"); // 8 hex chars
    const code = `${hex.slice(0, 4)}-${hex.slice(4)}`;
    plain.push(code);
    hashes.push(hashBackupCode(code));
  }
  return { plain, hashes };
}

/**
 * Verify a submitted code against the stored hashes (constant-time). On a match, returns the remaining
 * hashes with the used one removed (single-use). Returns null when no code matches.
 */
export function consumeBackupCode(stored: string[], code: string): string[] | null {
  const candidate = Buffer.from(hashBackupCode(code), "hex");
  let matchIndex = -1;
  for (let i = 0; i < stored.length; i++) {
    const h = Buffer.from(stored[i], "hex");
    if (h.length === candidate.length && timingSafeEqual(h, candidate)) {
      matchIndex = i;
      // no early break: keep the scan length independent of where the match is
    }
  }
  if (matchIndex === -1) return null;
  return stored.filter((_, i) => i !== matchIndex);
}
