import type { VendorNotifTemplate } from "@/lib/notify-channels";

/** Pure builder for the WhatsApp ticket template's ordered body variables. */
export function buildTicketWhatsApp(o: {
  eventName: string;
  ticketCount: number;
  ticketsUrl: string;
}): string[] {
  return [o.eventName, String(o.ticketCount), o.ticketsUrl];
}

/** Waitlist confirmation template body variables ({{1}} = link to the site). */
export function buildWaitlistWhatsApp(o: { url: string }): string[] {
  return [o.url];
}

export interface VendorWhatsAppData {
  brandName: string;
  stallLabel?: string;
  eventName?: string;
  payBy?: string;
  loadIn?: string;
  portalUrl: string;
}

/** Ordered body variables (cloud/interakt) + a free-text body (openwa fallback) per template. */
export function buildVendorWhatsApp(template: VendorNotifTemplate, d: VendorWhatsAppData): { params: string[]; text: string } {
  switch (template) {
    case "vendor-application":
      return {
        params: [d.brandName, d.portalUrl],
        text: `BDQ Social: we received ${d.brandName}'s vendor application. Our team calls within 48 hours - keep your phone close. Track it: ${d.portalUrl}`,
      };
    case "vendor-approved":
      return {
        params: [d.brandName, d.stallLabel ?? "", d.eventName ?? "", d.payBy ?? "", d.portalUrl],
        text: `BDQ Social: ${d.brandName} is approved! Complete payment by ${d.payBy} to lock Stall ${d.stallLabel} at ${d.eventName}: ${d.portalUrl}`,
      };
    case "vendor-rejected":
      return {
        params: [d.brandName, d.portalUrl],
        text: `BDQ Social: about ${d.brandName}'s vendor application - it wasn't approved this time. Call us and we'll help: ${d.portalUrl}`,
      };
    case "vendor-booking-confirmed":
      return {
        params: [d.brandName, d.stallLabel ?? "", d.eventName ?? "", d.portalUrl],
        text: `BDQ Social: Stall ${d.stallLabel} at ${d.eventName} is yours. See you at the market! Details: ${d.portalUrl}`,
      };
    case "vendor-event-reminder":
      return {
        params: [d.eventName ?? "", d.stallLabel ?? "", d.loadIn ?? "", d.portalUrl],
        text: `BDQ Social: ${d.eventName} is almost here - Stall ${d.stallLabel}.${d.loadIn ? ` Load-in: ${d.loadIn}.` : ""} Details: ${d.portalUrl}`,
      };
    case "vendor-loadin-reminder":
      return {
        params: [d.eventName ?? "", d.stallLabel ?? "", d.loadIn ?? "", d.portalUrl],
        text: `BDQ Social: load-in opens soon for ${d.eventName} (Stall ${d.stallLabel}): ${d.loadIn}. Details: ${d.portalUrl}`,
      };
  }
}
