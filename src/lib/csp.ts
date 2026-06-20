/**
 * Content-Security-Policy builder. Edge-safe: pure string building.
 *
 * Nonce migration COMPLETE: middleware enforces `strictCsp(nonce)` on every page in production.
 * The lenient `enforcedCsp` remains only for /api responses (middleware-excluded) and as the
 * dev Report-Only policy (HMR needs eval/inline). Violations report to /api/csp-report.
 */

const REPORT = "report-uri /api/csp-report; report-to csp-endpoint";

function policy(scriptSrc: string): string {
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    // Analytics beacons/pixels (Settings › Analytics; inert until an ID is set).
    "img-src 'self' data: blob: https://res.cloudinary.com https://www.google-analytics.com https://www.facebook.com https://*.clarity.ms",
    "font-src 'self' data:",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.googleapis.com https://*.firebaseapp.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.google.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://connect.facebook.net https://www.facebook.com https://*.clarity.ms",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    REPORT,
  ].join("; ");
}

/** Lenient ENFORCED policy (current): allows inline scripts so the app keeps working. */
export const enforcedCsp = policy(
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://apis.google.com https://www.gstatic.com https://www.google.com https://www.googletagmanager.com https://connect.facebook.net https://www.clarity.ms",
);

/** Strict nonce policy (Report-Only now → enforced after staging). `'strict-dynamic'` lets a nonced
 *  loader pull Razorpay/Firebase; `https:`/`'unsafe-inline'` are ignored by browsers that honor the
 *  nonce and act only as a fallback for older ones. */
export function strictCsp(nonce: string): string {
  return policy(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`);
}
