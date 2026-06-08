import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/** Stateless unsubscribe token: HMAC(contact) so a link can't be forged for an arbitrary address. */

function key(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

const normalize = (contact: string) => contact.trim().toLowerCase();

export function signUnsubscribe(contact: string): string {
  return createHmac("sha256", key()).update(normalize(contact)).digest("hex");
}

export function verifyUnsubscribe(contact: string, token: string): boolean {
  const expected = signUnsubscribe(contact);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Absolute unsubscribe URL for an email/phone (uses APP_BASE_DOMAIN). */
export function unsubscribeUrl(contact: string): string {
  const domain = process.env.APP_BASE_DOMAIN ?? "bdqsocial.com";
  const proto = domain.includes("localhost") ? "http" : "https";
  return `${proto}://${domain}/unsubscribe?c=${encodeURIComponent(normalize(contact))}&t=${signUnsubscribe(contact)}`;
}
