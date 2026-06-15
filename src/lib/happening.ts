/** Happening Strip shared types + kind metadata (R6.3). Pure (no server-only) so the customer
 *  client component and the server merge service share one source. */

export interface StripItem {
  id: string;
  kind: string; // HappeningKind
  emoji: string;
  title: string;
  detail?: string;
  href?: string;
  source: "manual" | "schedule" | "offer";
}

export const KIND_EMOJI: Record<string, string> = {
  LIVE_NOW: "🔴", STARTING_SOON: "⏳", OFFER: "🎁", ANNOUNCEMENT: "📣",
  SPONSOR: "✨", ACTIVITY: "🎪", WORKSHOP: "🧑‍🎨", PERFORMANCE: "🎵", FACILITY: "🚰",
};

/** Live Now → Starting Soon → Offers → Announcements → everything else. */
export const KIND_RANK: Record<string, number> = {
  LIVE_NOW: 0, STARTING_SOON: 1, OFFER: 2, ANNOUNCEMENT: 3,
  PERFORMANCE: 4, WORKSHOP: 4, ACTIVITY: 4, SPONSOR: 5, FACILITY: 6,
};

export const KIND_LABEL: Record<string, string> = {
  LIVE_NOW: "Live now", STARTING_SOON: "Starting soon", OFFER: "Offer", ANNOUNCEMENT: "Notice",
  SPONSOR: "Sponsor", ACTIVITY: "Activity", WORKSHOP: "Workshop", PERFORMANCE: "Performance", FACILITY: "Facility",
};

/** Accent colour per kind (RPA palette vars — resolved in the client). */
export const KIND_ACCENT: Record<string, string> = {
  LIVE_NOW: "var(--red)", STARTING_SOON: "var(--yellow)", OFFER: "var(--pink)", ANNOUNCEMENT: "var(--light-blue)",
  SPONSOR: "var(--light-blue)", ACTIVITY: "var(--green)", WORKSHOP: "var(--green)", PERFORMANCE: "var(--pink)", FACILITY: "var(--yellow)",
};
