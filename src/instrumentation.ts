/**
 * Server/edge error monitoring (build-plan R0.5, security §3.3). Fully inert without
 * SENTRY_DSN: no import, no init, logger keeps its console sink. With a DSN, every
 * logError() event AND every unhandled request error reaches Sentry, tagged by scope.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0, // errors only — tracing is a later, deliberate decision
  });

  const { setSink } = await import("@/lib/logger");
  setSink((event, err) => {
    // Keep the structured console line (Vercel log search) AND forward to Sentry.
    console.error(JSON.stringify(event));
    if (event.level === "error") {
      Sentry.captureException(err instanceof Error ? err : new Error(event.message), {
        tags: { scope: event.scope },
        extra: event,
      });
    }
  });
}

export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error — args match Next's RequestErrorContext tuple; Sentry types it itself.
  Sentry.captureRequestError(...args);
}
