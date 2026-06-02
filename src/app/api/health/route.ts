import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { healthStatus } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = true;
  let outboxFailed = 0;
  try {
    await db.$queryRaw`SELECT 1`;
    outboxFailed = await db.outbox.count({ where: { status: "FAILED" } });
  } catch {
    dbOk = false;
  }

  const { ok, degraded } = healthStatus({ dbOk, outboxFailed });
  return NextResponse.json(
    { ok, db: dbOk ? "ok" : "down", outboxFailed, degraded, ts: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
