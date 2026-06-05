import type { NextConfig } from "next";
import { enforcedCsp } from "./src/lib/csp";

// CSP: enforced in production, Report-Only in dev (Next HMR needs eval, which the policy omits).
// The lenient (unsafe-inline) policy lives here; middleware adds the strict nonce policy Report-Only
// in prod (staging the migration — see src/lib/csp.ts).
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/csp-report"' },
  { key: isProd ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: enforcedCsp },
];

// Admin IA route moves (old → new). Keep base + wildcard so dynamic sub-routes (e.g. comps/[id]) follow.
const adminRedirects = [
  ["/admin/map", "/admin/venue/maps"],
  ["/admin/venue/map", "/admin/venue/maps"],
  ["/admin/coupons", "/admin/tickets/coupons"],
  ["/admin/comps", "/admin/tickets/comps"],
  ["/admin/checkin", "/admin/ops/checkin"],
  ["/admin/staff", "/admin/ops/staff"],
  ["/admin/sponsors", "/admin/growth/sponsors"],
  ["/admin/waitlist", "/admin/growth/waitlist"],
  ["/admin/audit", "/admin/system/audit"],
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return adminRedirects.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: false },
      { source: `${from}/:path*`, destination: `${to}/:path*`, permanent: false },
    ]);
  },
};

export default nextConfig;
