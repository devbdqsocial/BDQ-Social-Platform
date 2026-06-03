import type { NextConfig } from "next";

// CSP: enforced in production, Report-Only in dev (Next HMR needs eval, which the policy omits).
// Allows: self + Razorpay checkout/api, Firebase auth, Cloudinary images, data:/blob: QR codes.
const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://apis.google.com https://www.gstatic.com https://www.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.googleapis.com https://*.firebaseapp.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.google.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: isProd ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
];

// Admin IA route moves (old → new). Keep base + wildcard so dynamic sub-routes (e.g. comps/[id]) follow.
const adminRedirects = [
  ["/admin/map", "/admin/venue/map"],
  ["/admin/coupons", "/admin/tickets/coupons"],
  ["/admin/comps", "/admin/tickets/comps"],
  ["/admin/checkin", "/admin/ops/checkin"],
  ["/admin/staff", "/admin/ops/staff"],
  ["/admin/sponsors", "/admin/growth/sponsors"],
  ["/admin/waitlist", "/admin/growth/waitlist"],
  ["/admin/audit", "/admin/system/audit"],
];

const nextConfig: NextConfig = {
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
