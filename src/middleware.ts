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
  if (override === "public") return "public";

  const cookieOverride = req.cookies.get("zone")?.value;
  const zone = override ?? cookieOverride;
  if ((zone === "vendor" || zone === "admin") && process.env.NODE_ENV !== "production") return zone;

  if (process.env.NODE_ENV !== "production") {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/admin") || pathname === "/admin") {
      return "admin";
    }
    if (pathname.startsWith("/vendor") || pathname === "/vendor") {
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

/**
 * Maps a flat, client-facing pretty URL path to the corresponding physical nested admin folder.
 * This ensures that links like `/maps` correctly resolve to `/admin/venue/maps` on the server.
 */
function mapAdminPath(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "/admin";
  }

  const staticMap: Record<string, string> = {
    "/dashboard": "/admin/dashboard",
    "/events": "/admin/events",
    "/events/new": "/admin/events/new",
    "/events/past": "/admin/events/past",
    "/maps": "/admin/venue/maps",
    "/maps/new": "/admin/venue/maps/new",
    "/elements": "/admin/venue/elements",
    "/stalls": "/admin/venue/stalls",
    "/map": "/admin/venue/map",
    "/orders": "/admin/tickets/orders",
    "/attendees": "/admin/tickets/attendees",
    "/comps": "/admin/tickets/comps",
    "/coupons": "/admin/tickets/coupons",
    "/vendors": "/admin/vendors",
    "/vendors/new": "/admin/vendors/new",
    "/checkin": "/admin/ops/checkin",
    "/monitor": "/admin/ops/monitor",
    "/pos": "/admin/ops/pos",
    "/tasks": "/admin/ops/tasks",
    "/staff": "/admin/ops/staff",
    "/ops": "/admin/ops",
    "/revenue": "/admin/finance/revenue",
    "/payments": "/admin/finance/payments",
    "/sponsors": "/admin/growth/sponsors",
    "/waitlist": "/admin/growth/waitlist",
    "/campaigns": "/admin/growth/campaigns",
    "/audit": "/admin/system/audit",
    "/roles": "/admin/system/roles",
    "/notifications": "/admin/system/notifications",
    "/settings": "/admin/system/settings",
    "/login": "/admin/login",
  };

  if (staticMap[pathname]) {
    return staticMap[pathname];
  }

  // Handle dynamic sub-routes matching events, maps, orders, and vendors
  if (pathname.startsWith("/events/")) {
    const parts = pathname.split("/");
    if (parts.length === 3) return `/admin/events/${parts[2]}`;
    if (parts.length === 4 && parts[3] === "map") return `/admin/events/${parts[2]}/map`;
  }
  if (pathname.startsWith("/maps/")) {
    const parts = pathname.split("/");
    if (parts.length === 3) return `/admin/venue/maps/${parts[2]}`;
  }
  if (pathname.startsWith("/orders/")) {
    const parts = pathname.split("/");
    if (parts.length === 3) return `/admin/tickets/orders/${parts[2]}`;
  }
  if (pathname.startsWith("/comps/")) {
    const parts = pathname.split("/");
    if (parts.length === 3) return `/admin/tickets/comps/${parts[2]}`;
  }
  if (pathname.startsWith("/vendors/")) {
    const parts = pathname.split("/");
    if (parts.length === 3) return `/admin/vendors/${parts[2]}`;
  }

  return `/admin${pathname}`;
}

/**
 * Resolves a nested physical admin path back to its pretty, flat client-facing URL.
 * Used to redirect direct browser requests to physical paths (like bookmarks or server action redirects)
 * to their pretty, non-prefixed counterparts.
 */
function getPrettyPath(pathname: string): string | null {
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith("/assets")) {
    return null;
  }

  const reverseMap: Record<string, string> = {
    "/admin/dashboard": "/dashboard",
    "/admin/events": "/events",
    "/admin/events/new": "/events/new",
    "/admin/events/past": "/events/past",
    "/admin/venue/maps": "/maps",
    "/admin/venue/maps/new": "/maps/new",
    "/admin/venue/elements": "/elements",
    "/admin/venue/stalls": "/stalls",
    "/admin/venue/map": "/map",
    "/admin/tickets/orders": "/orders",
    "/admin/tickets/attendees": "/attendees",
    "/admin/tickets/comps": "/comps",
    "/admin/tickets/coupons": "/coupons",
    "/admin/vendors": "/vendors",
    "/admin/vendors/new": "/vendors/new",
    "/admin/ops/checkin": "/checkin",
    "/admin/ops/monitor": "/monitor",
    "/admin/ops/pos": "/pos",
    "/admin/ops/tasks": "/tasks",
    "/admin/ops/staff": "/staff",
    "/admin/ops": "/ops",
    "/admin/finance/revenue": "/revenue",
    "/admin/finance/payments": "/payments",
    "/admin/growth/sponsors": "/sponsors",
    "/admin/growth/waitlist": "/waitlist",
    "/admin/growth/campaigns": "/campaigns",
    "/admin/system/audit": "/audit",
    "/admin/system/roles": "/roles",
    "/admin/system/notifications": "/notifications",
    "/admin/system/settings": "/settings",
    "/admin/login": "/login",
    "/admin": "/dashboard",
  };

  if (reverseMap[pathname]) {
    return reverseMap[pathname];
  }

  // Reverse match dynamic sub-routes matching events, maps, orders, and vendors
  if (pathname.startsWith("/admin/events/")) {
    const parts = pathname.split("/");
    if (parts.length === 4) return `/events/${parts[3]}`;
    if (parts.length === 5 && parts[4] === "map") return `/events/${parts[3]}/map`;
  }
  if (pathname.startsWith("/admin/venue/maps/")) {
    const parts = pathname.split("/");
    if (parts.length === 5) return `/maps/${parts[4]}`;
  }
  if (pathname.startsWith("/admin/tickets/orders/")) {
    const parts = pathname.split("/");
    if (parts.length === 5) return `/orders/${parts[4]}`;
  }
  if (pathname.startsWith("/admin/tickets/comps/")) {
    const parts = pathname.split("/");
    if (parts.length === 5) return `/comps/${parts[4]}`;
  }
  if (pathname.startsWith("/admin/vendors/")) {
    const parts = pathname.split("/");
    if (parts.length === 4) return `/vendors/${parts[3]}`;
  }

  if (pathname.startsWith("/admin")) {
    return pathname.replace(/^\/admin/, "") || "/";
  }

  return null;
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

  if (zone === "admin") {
    // A. Intercept direct browser requests targeting physical nested paths and redirect to pretty URL
    const isInternal = req.headers.get("x-internal-rewrite") === "true";
    if (!isInternal && (pathname.startsWith("/admin") || pathname === "/admin")) {
      const pretty = getPrettyPath(pathname);
      if (pretty) {
        const url = req.nextUrl.clone();
        url.pathname = pretty;
        url.search = req.nextUrl.search;
        return finalize(NextResponse.redirect(url));
      }
    }

    // B. Rewrite incoming pretty URL request to physical nested admin path
    if (!pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = mapAdminPath(pathname);
      requestHeaders.set("x-internal-rewrite", "true");
      const opts = { request: { headers: requestHeaders } };
      return finalize(NextResponse.rewrite(url, opts));
    }
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
