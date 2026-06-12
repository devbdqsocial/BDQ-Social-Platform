import { NextRequest, NextResponse } from "next/server";
import { strictCsp } from "@/lib/csp";

/**
 * Subdomain → zone routing (Docs/ARCHITECTURE.md §5). One app serves four hostnames:
 *   bdqsocial.com / *.localhost            → public + customer (apex routes)
 *   vendors.bdqsocial.com                  → /vendor/*
 *   admin.bdqsocial.com                    → /admin/*
 * Coarse gate only; per-action RBAC is enforced server-side. Dev override: ?zone=vendor|admin.
 * Admin/vendor zones use a plain prefix rewrite — links use PHYSICAL paths everywhere
 * (pretty-URL map deleted in rebuild R0.2; see Docs/audit/architecture.md §2, changes.md DR-2).
 * Also mints a per-request CSP nonce and enforces the strict policy in prod.
 */
type Zone = "public" | "vendor" | "admin";

// Policy/contact pages stay reachable even in coming-soon mode (Razorpay verification + legal access).
// "/offline" is precached by sw.js — rewriting it to coming-soon would poison the offline cache.
const ALWAYS_PUBLIC = ["/privacy", "/terms", "/refunds", "/shipping", "/contact", "/about", "/vendor-terms", "/unsubscribe", "/offline"];

function resolveZone(req: NextRequest): Zone {
  const override = req.nextUrl.searchParams.get("zone");
  if (override === "public") return "public";

  const cookieOverride = req.cookies.get("zone")?.value;
  const zone = override ?? cookieOverride;
  if ((zone === "vendor" || zone === "admin") && process.env.NODE_ENV !== "production") return zone;

  if (process.env.NODE_ENV !== "production") {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/admin") || pathname === "/admin") {
      return "admin";
    }
    // Exact segment match only: "/vendors" (public brands) and "/vendor-terms" etc. are
    // PUBLIC pages — a bare startsWith("/vendor") used to capture them, persist a
    // zone=vendor cookie, and 404 every later public route in dev.
    if (pathname === "/vendor" || pathname.startsWith("/vendor/")) {
      return "vendor";
    }
  }

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

  // Per-request nonce → strict CSP, ENFORCED in production (nonce migration complete; dev is left
  // untouched to avoid HMR-eval noise — next.config serves dev a lenient Report-Only policy).
  // Setting the CSP request header makes Next stamp the nonce onto its own scripts.
  const isProd = process.env.NODE_ENV === "production";
  const nonce = isProd ? makeNonce() : "";
  const requestHeaders = new Headers(req.headers);
  if (isProd) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", strictCsp(nonce));
  }
  const opts = { request: { headers: requestHeaders } };
  const finalize = (res: NextResponse): NextResponse => {
    if (isProd) res.headers.set("Content-Security-Policy", strictCsp(nonce));

    // Set/delete zone cookies locally to persist sidebar navigation transitions during local development
    const queryZone = req.nextUrl.searchParams.get("zone");
    if (!isProd) {
      if (queryZone === "public") {
        res.cookies.delete("zone");
      } else if (queryZone && (queryZone === "admin" || queryZone === "vendor")) {
        res.cookies.set("zone", queryZone, { path: "/", maxAge: 60 * 60 * 24 }); // 1 day
      } else if (zone === "admin" || zone === "vendor") {
        res.cookies.set("zone", zone, { path: "/", maxAge: 60 * 60 * 24 }); // 1 day
      }
    }
    return res;
  };

  if (
    zone === "public" &&
    process.env.NEXT_PUBLIC_IS_COMING_SOON === "true" &&
    process.env.NODE_ENV === "production" &&
    pathname !== "/coming-soon" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/vendor") &&
    !ALWAYS_PUBLIC.includes(pathname)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/coming-soon";
    return finalize(NextResponse.rewrite(url, opts));
  }

  // Host-based zones serve the same physical paths the app links to: only prefix bare paths
  // (e.g. admin.bdqsocial.com/ → /admin). Anything already under the zone prefix passes through.
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
  // sw.js/robots.txt/sitemap.xml must bypass zone routing — the coming-soon rewrite was serving
  // them as HTML (sw registration MIME error + invalid robots.txt in production audits).
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|manifest.webmanifest|icon|sw\\.js|robots\\.txt|sitemap\\.xml).*)",
  ],
};
