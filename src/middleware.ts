import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain → zone routing (Docs/ARCHITECTURE.md §5). One app serves four hostnames:
 *   bdqsocial.com / *.localhost            → public + customer (apex routes)
 *   vendors.bdqsocial.com                  → /vendor/*
 *   admin.bdqsocial.com                    → /admin/*
 * Coarse gate only; per-action RBAC is enforced server-side. Dev override: ?zone=vendor|admin.
 */
type Zone = "public" | "vendor" | "admin";

function resolveZone(req: NextRequest): Zone {
  const override = req.nextUrl.searchParams.get("zone");
  if ((override === "vendor" || override === "admin") && process.env.NODE_ENV !== "production") return override;

  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (host.startsWith("admin.")) return "admin";
  if (host.startsWith("vendors.")) return "vendor";
  return "public";
}

export function middleware(req: NextRequest) {
  const zone = resolveZone(req);
  const { pathname } = req.nextUrl;

  if (
    zone === "public" && 
    process.env.NEXT_PUBLIC_IS_COMING_SOON === "true" && 
    pathname !== "/coming-soon" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/vendor")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/coming-soon";
    return NextResponse.rewrite(url);
  }

  if (zone === "admin" && !pathname.startsWith("/admin")) {
    const url = req.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  if (zone === "vendor" && !pathname.startsWith("/vendor")) {
    const url = req.nextUrl.clone();
    url.pathname = `/vendor${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|assets|favicon.ico|manifest.webmanifest|icon).*)"],
};
