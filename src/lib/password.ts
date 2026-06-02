import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

/**
 * Password hashing for admin/staff credentials. Uses Node's built-in scrypt (no external dep).
 * Stored format: `salt:derivedKey`, both hex. Comparison is constant-time.
 */

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const dk = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${dk.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const dk = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return expected.length === dk.length && timingSafeEqual(expected, dk);
}
