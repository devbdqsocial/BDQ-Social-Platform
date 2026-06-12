import type { NextConfig } from "next";
import { enforcedCsp } from "./src/lib/csp";

// CSP: in production the MIDDLEWARE enforces the strict nonce policy on every page (migration
// complete — see src/lib/csp.ts). Here we only cover what middleware doesn't reach: /api responses
// get the static policy in prod; dev gets a lenient Report-Only everywhere (HMR needs eval).
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
];

const apiCsp = { key: "Content-Security-Policy", value: enforcedCsp };
const devCsp = { key: "Content-Security-Policy-Report-Only", value: enforcedCsp };

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Next 15 streams metadata into <body> for dynamic pages; head-only parsers (Lighthouse — whose
  // UA is a plain Moto G/Mac Chrome string no bot regex can catch — plus naive SEO/preview tools)
  // then miss the description. Our metadata is static or 60s-cached, so blocking <head> metadata
  // costs nothing: match every UA to restore classic behavior.
  htmlLimitedBots: /./,
  async headers() {
    return isProd
      ? [
          { source: "/:path*", headers: securityHeaders },
          { source: "/api/:path*", headers: [apiCsp] },
        ]
      : [{ source: "/:path*", headers: [...securityHeaders, devCsp] }];
  },
};

export default nextConfig;
