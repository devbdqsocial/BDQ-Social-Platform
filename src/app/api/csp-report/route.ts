import { NextResponse } from "next/server";
import { logWarn } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * Collects browser CSP violation reports (report-uri / report-to) emitted by the strict Report-Only
 * policy during the nonce migration. Logs them so we can confirm the policy is clean before enforcing.
 */
export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, "csp-report", 120, 10 * 60 * 1000);
  if (limited) return limited;
  try {
    const body = await req.json();
    logWarn("csp.violation", "CSP report", { report: body });
  } catch {
    // ignore malformed report bodies
  }
  return new NextResponse(null, { status: 204 });
}
