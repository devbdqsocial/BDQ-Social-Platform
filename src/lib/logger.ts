/** Minimal structured error logger. Swap the console sink for Sentry later via an adapter. */
export function logError(scope: string, err: unknown, meta?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ level: "error", scope, message, ...meta, ts: new Date().toISOString() }));
  if (err instanceof Error && err.stack && process.env.NODE_ENV !== "production") console.error(err.stack);
}
