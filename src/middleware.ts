import { NextRequest, NextResponse } from "next/server";
import { strictCsp } from "@/lib/csp";

/**
 * Subdomain → zone routing (Docs/ARCHITECTURE.md §5). One app serves four hostnames:
 *   bdqsocial.com / *.localhost            → public + customer (apex routes)
 *   vendors.bdqsocial.com                  → /vendor/*
 *   admin.bdqsocial.com                    → /admin/*
 * Coarse gate only; per-action RBAC is enforced server-side. Dev override: ?zone=vendor|admin.
 * Also mints a per-request CSP nonce and serves the strict policy Report-Only in prod (nonce migration).
 */
type Zone = "public" | "vendor" | "admin";

// Policy/contact pages stay reachable even in coming-soon mode (Razorpay verification + legal access).
const ALWAYS_PUBLIC = ["/privacy", "/terms", "/refunds", "/shipping", "/contact", "/about", "/vendor-terms"];

function resolveZone(req: NextRequest): Zone {
  const override = req.nextUrl.searchParams.get("zone");
  if ((override === "vendor" || override === "admin") && process.env.NODE_ENV !== "production") return override;

  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (host.startsWith("admin.")) return "admin";
  if (host.startsWith("vendors.")) return "vendor";
  return "public";
}

function makeNonce(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  let s = "";
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s);
}

export function middleware(req: NextRequest) {
  const zone = resolveZone(req);
  const { pathname } = req.nextUrl;

  // Per-request nonce → strict CSP, served Report-Only in production (staging the nonce migration;
  // dev is left untouched to avoid HMR-eval noise). Setting the CSP request header makes Next stamp
  // the nonce onto its own scripts.
  const isProd = process.env.NODE_ENV === "production";
  const nonce = isProd ? makeNonce() : "";
  const requestHeaders = new Headers(req.headers);
  if (isProd) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", strictCsp(nonce));
  }
  const opts = { request: { headers: requestHeaders } };
  const finalize = (res: NextResponse): NextResponse => {
    if (isProd) res.headers.set("Content-Security-Policy-Report-Only", strictCsp(nonce));
    return res;
  };

  if (
    zone === "public" &&
    process.env.NEXT_PUBLIC_IS_COMING_SOON === "true" &&
    pathname !== "/coming-soon" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/vendor") &&
    !ALWAYS_PUBLIC.includes(pathname)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/coming-soon";
    return finalize(NextResponse.rewrite(url, opts));
  }

  if (zone === "admin" && !pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return finalize(NextResponse.rewrite(url, opts));
  }
  if (zone === "vendor" && !pathname.startsWith("/vendor")) {
    const url = req.nextUrl.clone();
    url.pathname = `/vendor${pathname === "/" ? "" : pathname}`;
    return finalize(NextResponse.rewrite(url, opts));
  }
  return finalize(NextResponse.next(opts));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|assets|favicon.ico|manifest.webmanifest|icon).*)"],
};
