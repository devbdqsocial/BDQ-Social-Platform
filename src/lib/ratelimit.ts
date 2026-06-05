import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { clientIp } from "@/lib/client-ip";

/**
 * Fixed-window rate limit backed by Postgres (serverless-safe, shared across instances; no Redis).
 * A single atomic upsert (INSERT … ON CONFLICT) does the increment-or-reset, so concurrent requests
 * cannot slip past the cap via a read-then-write race. Returns true if allowed (BUSINESS-RULES §8).
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const newReset = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${newReset})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${newReset} ELSE "RateLimit"."resetAt" END
    RETURNING "count"
  `;
  return Number(rows[0]?.count ?? 1) <= max;
}

/**
 * Returns a 429 response if over the limit, else null. Call before auth/body parsing.
 * Pass `target` (e.g. email/phone) to also bound per-account attempts, defeating IP rotation.
 */
export async function enforceRateLimit(
  req: Request,
  action: string,
  max: number,
  windowMs: number,
  target?: string,
): Promise<NextResponse | null> {
  const key = target ? `${action}:${clientIp(req)}:${target}` : `${action}:${clientIp(req)}`;
  const allowed = await rateLimit(key, max, windowMs);
  return allowed ? null : NextResponse.json({ ok: false, error: { code: "RATE_LIMITED" } }, { status: 429 });
}
