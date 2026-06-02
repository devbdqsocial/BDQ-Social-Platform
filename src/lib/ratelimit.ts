import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { nextWindow } from "@/lib/rate-window";

/**
 * Fixed-window rate limit backed by Postgres (serverless-safe, shared across instances; no Redis).
 * Good enough for abuse protection on OTP/checkout/etc (BUSINESS-RULES §8). Returns true if allowed.
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const row = await db.rateLimit.findUnique({ where: { key } });
  const d = nextWindow(row, now, max, windowMs);

  if (d.reset) {
    await db.rateLimit.upsert({
      where: { key },
      update: { count: 1, resetAt: d.resetAt },
      create: { key, count: 1, resetAt: d.resetAt },
    });
    return true;
  }
  if (!d.allowed) return false;
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}

function clientKey(req: Request, action: string): string {
  const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "local")
    .split(",")[0]
    .trim();
  return `${action}:${ip}`;
}

/** Returns a 429 response if over the limit, else null. Call before auth/body parsing. */
export async function enforceRateLimit(
  req: Request,
  action: string,
  max: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const allowed = await rateLimit(clientKey(req, action), max, windowMs);
  return allowed ? null : NextResponse.json({ ok: false, error: { code: "RATE_LIMITED" } }, { status: 429 });
}
