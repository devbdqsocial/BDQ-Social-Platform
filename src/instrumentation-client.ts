/**
 * Client error monitoring (build-plan R0.5). Inert without NEXT_PUBLIC_SENTRY_DSN — the
 * dynamic import keeps the Sentry client SDK out of the bundle entirely when unset.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
    });
  });
}
