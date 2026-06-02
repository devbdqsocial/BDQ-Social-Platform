import { createHmac, timingSafeEqual } from "crypto";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/**
 * Signed ticket tokens. The QR encodes `<payloadB64>.<sigB64>`; the gate scanner verifies the
 * HMAC server-side before checking the DB (Docs/ARCHITECTURE.md §9.4, §17). Tampered or
 * wrong-secret tokens are rejected. Secret defaults to SESSION_SECRET (override in tests).
 */

const defaultSecret = () => env.SESSION_SECRET ?? "dev-insecure-secret";

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function signTicketToken(ticketId: string, secret = defaultSecret()): string {
  const payloadB64 = b64url(JSON.stringify({ tid: ticketId, iat: Date.now() }));
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
    const { tid } = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return typeof tid === "string" ? { valid: true, ticketId: tid } : { valid: false };
  } catch {
    return { valid: false };
  }
}

export function toQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { errorCorrectionLevel: "M", margin: 1, width: 320 });
}
