import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM field encryption for sensitive PII at rest (vendor KYC: PAN/GSTIN/FSSAI). Stored as
 * `enc:v1:<base64(iv|tag|ciphertext)>`. Values without the prefix are treated as legacy plaintext
 * (readable until the one-off backfill runs), so rollout is non-breaking. Key: `KYC_ENC_KEY`
 * (base64-encoded 32 bytes). GCM's auth tag makes tampering detectable (decrypt throws).
 */

const PREFIX = "enc:v1:";

function key(): Buffer {
  const k = process.env.KYC_ENC_KEY;
  if (!k) throw new Error("KYC_ENC_KEY not configured");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new Error("KYC_ENC_KEY must be base64-encoded 32 bytes");
  return buf;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptField(stored: string): string {
  if (!isEncrypted(stored)) return stored; // legacy plaintext (pre-backfill)
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export const encryptNullable = (v: string | null | undefined): string | null =>
  v == null || v === "" ? null : encryptField(v);

export const decryptNullable = (v: string | null | undefined): string | null =>
  v == null ? null : decryptField(v);
