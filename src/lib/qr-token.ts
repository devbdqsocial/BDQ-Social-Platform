import { createHmac, timingSafeEqual } from "crypto";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/**
 * Signed ticket tokens. The QR encodes `<payloadB64>.<sigB64>`; the gate scanner verifies the
 * HMAC server-side before checking the DB (Docs/ARCHITECTURE.md §9.4, §17). Tampered, expired, or
 * wrong-secret tokens are rejected. Uses a dedicated QR_TOKEN_SECRET (falls back to SESSION_SECRET);
 * the insecure dev fallback can never apply in production (SESSION_SECRET is required there).
 */

/** Allow check-in up to this long after the event ends, then the token is dead. */
const GRACE_MS = 12 * 60 * 60 * 1000;

const defaultSecret = () => {
  const s = env.QR_TOKEN_SECRET ?? env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("QR token secret not configured");
  return "dev-insecure-secret";
};

/** Token expiry (epoch ms) for a ticket whose event ends at `eventEndsAt`. */
export const ticketTokenExpiry = (eventEndsAt: Date): number => eventEndsAt.getTime() + GRACE_MS;

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function signTicketToken(ticketId: string, secret = defaultSecret(), expiresAtMs?: number): string {
  const payload: { tid: string; iat: number; exp?: number } = { tid: ticketId, iat: Date.now() };
  if (expiresAtMs != null) payload.exp = expiresAtMs;
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function verifyTicketToken(
  token: string,
  secret = defaultSecret(),
): { valid: boolean; ticketId?: string } {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return { valid: false };

  const expected = sign(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false };

  try {
    const { tid, exp } = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (typeof tid !== "string") return { valid: false };
    if (typeof exp === "number" && Date.now() > exp) return { valid: false };
    return { valid: true, ticketId: tid };
  } catch {
    return { valid: false };
  }
}

export function toQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { errorCorrectionLevel: "M", margin: 1, width: 320 });
}
