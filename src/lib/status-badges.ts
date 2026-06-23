/**
 * Status → Badge {label, variant} — the SINGLE source for admin status pills
 * (design-system §4.2/§4.4, design-debt D11/D13). Tables import from here; never inline a
 * status map. Variants match ui/badge.tsx exactly (no `pending`/`gold` — those were deleted).
 */

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger";
export interface StatusBadge {
  label: string;
  variant: BadgeVariant;
}

export const ORDER_STATUS: Record<string, StatusBadge> = {
  PAID: { label: "Paid", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  FAILED: { label: "Failed", variant: "danger" },
  EXPIRED: { label: "Expired", variant: "neutral" },
};

export const PAYMENT_STATUS: Record<string, StatusBadge> = {
  CAPTURED: { label: "Captured", variant: "success" },
  CREATED: { label: "Created", variant: "warning" },
  FAILED: { label: "Failed", variant: "danger" },
};

export const VENDOR_STATUS: Record<string, StatusBadge> = {
  SUBMITTED: { label: "New", variant: "primary" },
  UNDER_REVIEW: { label: "Reviewing", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Declined", variant: "danger" },
};

export const ARTIST_BOOKING_STATUS: Record<string, StatusBadge> = {
  INQUIRY: { label: "Inquiry", variant: "neutral" },
  NEGOTIATING: { label: "Negotiating", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export const ARTIST_SETTLEMENT: Record<string, StatusBadge> = {
  UNPAID: { label: "Unpaid", variant: "danger" },
  PARTIAL: { label: "Part-paid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
};

// HELD is the DB label for "reserved by a vendor application" until the M2 rename; PENDING
// kept only for tolerance of any legacy rows until that migration lands (architecture §4.1).
export const STALL_STATUS: Record<string, StatusBadge> = {
  AVAILABLE: { label: "Available", variant: "success" },
  HELD: { label: "Reserved", variant: "warning" },
  BOOKED: { label: "Booked", variant: "primary" },
  BLOCKED: { label: "Blocked", variant: "neutral" },
  PENDING: { label: "Pending", variant: "warning" },
};

export const SPONSOR_STATUS: Record<string, StatusBadge> = {
  PROPOSED: { label: "Proposed", variant: "neutral" },
  SIGNED: { label: "Signed", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
};

/** Event status collapses PUBLISHED+LIVE → "Live"; everything else is a single neutral label. */
export function eventStatusBadge(status: string): StatusBadge {
  if (status === "PUBLISHED" || status === "LIVE") return { label: "Live", variant: "success" };
  if (status === "ARCHIVED") return { label: "Archived", variant: "neutral" };
  if (status === "ENDED") return { label: "Ended", variant: "neutral" };
  return { label: "Draft", variant: "neutral" };
}
