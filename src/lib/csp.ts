/**
 * Content-Security-Policy builder, shared by next.config.ts (enforced header) and middleware.ts
 * (the strict nonce policy, served Report-Only during staging). Edge-safe: pure string building.
 *
 * Migration path (see [[csp-nonce-deferred]]): today the ENFORCED policy keeps 'unsafe-inline' so
 * nothing breaks; the STRICT nonce policy runs Report-Only in production to surface what would break.
 * Once reports are clean, swap the enforced header to `strictCsp(nonce)` and drop this lenient one.
 */

const REPORT = "report-uri /api/csp-report; report-to csp-endpoint";

function policy(scriptSrc: string): string {
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.googleapis.com https://*.firebaseapp.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.google.com",
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
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://apis.google.com https://www.gstatic.com https://www.google.com",
);

/** Strict nonce policy (Report-Only now → enforced after staging). `'strict-dynamic'` lets a nonced
 *  loader pull Razorpay/Firebase; `https:`/`'unsafe-inline'` are ignored by browsers that honor the
 *  nonce and act only as a fallback for older ones. */
export function strictCsp(nonce: string): string {
  return policy(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`);
}
