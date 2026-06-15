import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Lightweight analytics sink (R6.1). Logs a structured event; rate-limited to deter abuse. */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, "track", 120, 60 * 1000);
  if (limited) return limited;
  try {
    const { event, props, ts } = (await req.json()) as { event?: string; props?: unknown; ts?: number };
    if (typeof event === "string") {
      console.log(JSON.stringify({ tag: "track", event, props: props ?? {}, ts: ts ?? Date.now() }));
    }
  } catch {
    /* ignore malformed beacons */
  }
  return NextResponse.json({ ok: true });
}
