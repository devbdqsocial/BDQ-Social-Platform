import { timingSafeEqual } from "crypto";

/**
 * Cron endpoint auth. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; `x-cron-key` is also
 * accepted for manual/local runs. Constant-time compare; fail-closed when CRON_SECRET is unset.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isCronAuthed(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth && safeEqual(auth, `Bearer ${secret}`)) return true;
  const key = req.headers.get("x-cron-key");
  if (key && safeEqual(key, secret)) return true;
  return false;
}
