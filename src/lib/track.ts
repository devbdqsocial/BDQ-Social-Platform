/**
 * Minimal product analytics (R6.1). Fire-and-forget; must NEVER break UX. Sends a structured event
 * to /api/track (logged, searchable in Vercel logs) — swappable for a real provider later. Used to
 * measure share-art adoption: share_view / share_generated / share_downloaded / share_attempted /
 * share_completed / share_failed.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  try {
    const body = JSON.stringify({ event, props: props ?? {}, ts: Date.now() });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else if (typeof fetch === "function") {
      void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* analytics must never break the experience */
  }
}
