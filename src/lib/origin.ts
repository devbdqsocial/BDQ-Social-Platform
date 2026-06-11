import { NextResponse } from "next/server";

/**
 * CSRF backstop for browser-facing route handlers: state-changing requests that DO carry an
 * Origin header must come from our own host (any zone subdomain serves same-host pages).
 * Requests without an Origin header pass — do NOT use this on webhooks/cron (server-to-server);
 * they authenticate with signatures/secrets instead.
 */
export function rejectCrossOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  if (!host) return null;
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* malformed Origin → reject below */
  }
  return NextResponse.json({ ok: false, error: { code: "CROSS_ORIGIN" } }, { status: 403 });
}
