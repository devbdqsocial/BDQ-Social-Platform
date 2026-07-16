/**
 * Well-known LegalDocument slugs. The legacy nine keep their original public URLs (/terms, not
 * /legal/terms); net-new published PUBLIC docs render at /legal/[slug]. Well-known docs CAN be
 * archived/deleted (their pages fall back to built-in text) but destructive actions require the
 * stronger type-to-confirm dialog.
 */

export const LEGACY_LEGAL_SLUGS = [
  "terms",
  "privacy",
  "refunds",
  "shipping",
  "vendor-terms",
  "vendor-rules",
  "vendor-agreement",
  "vendor-booking-policy",
  "vendor-data-policy",
] as const;

export type LegacyLegalSlug = (typeof LEGACY_LEGAL_SLUGS)[number];

/** Global vendor participation agreement template (also the /vendor-agreement page). */
export const GLOBAL_CONTRACT_SLUG = "vendor-agreement";
/** Fallback per-booking agreement template when no event/stall-type contract is assigned. */
export const BOOKING_CONTRACT_DEFAULT_SLUG = "booking-agreement-default";

export const WELL_KNOWN_SLUGS: readonly string[] = [...LEGACY_LEGAL_SLUGS, BOOKING_CONTRACT_DEFAULT_SLUG];

export function isLegacyLegalSlug(slug: string): slug is LegacyLegalSlug {
  return (LEGACY_LEGAL_SLUGS as readonly string[]).includes(slug);
}

/** Short footer labels for the legacy docs (full titles are too long for the footer rail). */
export const FOOTER_LABEL: Partial<Record<string, string>> = {
  terms: "Terms",
  privacy: "Privacy",
  refunds: "Refunds",
  shipping: "Shipping",
  "vendor-terms": "Vendor terms",
  "vendor-rules": "Event rules",
  "vendor-agreement": "Vendor agreement",
  "vendor-booking-policy": "Booking policy",
  "vendor-data-policy": "Data policy",
};

/** Public URL for a doc slug. */
export function pathForSlug(slug: string): string {
  return isLegacyLegalSlug(slug) ? `/${slug}` : `/legal/${slug}`;
}
