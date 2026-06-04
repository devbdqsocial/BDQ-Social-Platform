/**
 * Structured JSON logger. All server-side error paths should go through logError.
 * To plug in Sentry: set `sinkOverride = (e) => Sentry.captureException(e.err, { extra: e })` once.
 */

export interface LogEvent {
  level: "error" | "warn" | "info";
  scope: string;
  message: string;
  requestId?: string;
  ts: string;
  [key: string]: unknown;
}

type Sink = (event: LogEvent, err: unknown) => void;

let sinkOverride: Sink | null = null;

/** Swap the default console sink (e.g. for Sentry). Call once at app startup. */
export function setSink(sink: Sink) {
  sinkOverride = sink;
}

export function logError(scope: string, err: unknown, meta?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  const event: LogEvent = { level: "error", scope, message, ...meta, ts: new Date().toISOString() };

  if (sinkOverride) {
    sinkOverride(event, err);
  } else {
    console.error(JSON.stringify(event));
    if (err instanceof Error && err.stack && process.env.NODE_ENV !== "production") {
      console.error(err.stack);
    }
  }
}

export function logWarn(scope: string, message: string, meta?: Record<string, unknown>): void {
  const event: LogEvent = { level: "warn", scope, message, ...meta, ts: new Date().toISOString() };
  if (sinkOverride) sinkOverride(event, null);
  else console.warn(JSON.stringify(event));
}
