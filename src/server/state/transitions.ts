/**
 * Allowed state transitions (Docs/audit/architecture.md §4.1 — booking collapse, R1.3). Pure
 * guards used before any DB write so illegal/inconsistent moves are rejected server-side.
 * Notably: no path un-pays an order, no re-entry resets a CHECKED_IN ticket, and the vendor
 * flow cannot jump a stall straight to BOOKED — backstopped by the DB partial-unique index.
 * (Admin direct booking is a separate audited path.)
 */

type Transitions<T extends string> = Record<T, readonly T[]>;

// HELD remains the DB label for "reserved by a vendor application" until the M2 destructive
// migration renames it to RESERVED; stall PENDING (paid-awaiting-verification) is retired.
export type StallStatus = "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED";
export const STALL_TRANSITIONS: Transitions<StallStatus> = {
  AVAILABLE: ["HELD", "BLOCKED"], // vendor reserves, or admin blocks
  HELD: ["BOOKED", "AVAILABLE"], // vendor pays after approval, or reject/cancel/expiry
  BOOKED: ["AVAILABLE"], // organizer cancel
  BLOCKED: ["AVAILABLE"],
};

export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";
export const ORDER_TRANSITIONS: Transitions<OrderStatus> = {
  PENDING: ["PAID", "FAILED", "EXPIRED"],
  PAID: [], // terminal (no refunds)
  FAILED: [],
  EXPIRED: [],
};

export type TicketStatus = "VALID" | "CHECKED_IN" | "CANCELLED";
export const TICKET_TRANSITIONS: Transitions<TicketStatus> = {
  VALID: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: [], // terminal (single entry)
  CANCELLED: [],
};

export type BookingStatus = "RESERVED" | "PENDING_PAYMENT" | "BOOKED" | "REJECTED" | "CANCELLED";
export const BOOKING_TRANSITIONS: Transitions<BookingStatus> = {
  RESERVED: ["PENDING_PAYMENT", "REJECTED", "CANCELLED"], // admin approves / rejects, vendor cancels
  PENDING_PAYMENT: ["BOOKED", "CANCELLED"], // webhook pays, or payBy window lapses
  BOOKED: ["CANCELLED"], // organizer cancel
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition<T extends string>(
  map: Transitions<T>,
  from: T,
  to: T,
): boolean {
  return map[from]?.includes(to) ?? false;
}
