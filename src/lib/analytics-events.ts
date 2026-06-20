/**
 * Client-side conversion events fired into whatever analytics SiteAnalytics injected (GA4 / Meta Pixel /
 * Clarity). Each call is guarded and swallowed — analytics must never break the UX. No PII is sent.
 */

type AnyFn = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: AnyFn;
    fbq?: AnyFn;
    clarity?: AnyFn;
  }
}

export function trackWaitlistSignup(type: "STALL" | "TICKET"): void {
  try {
    window.gtag?.("event", "waitlist_signup", { method: type });
    window.fbq?.("track", "Lead", { content_category: type });
    window.clarity?.("event", "waitlist_signup");
  } catch {
    /* never throw from analytics */
  }
}
