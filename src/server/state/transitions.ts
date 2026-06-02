/**
 * Allowed state transitions (Docs/project.md §8, ARCHITECTURE §10). Pure guards used before any
 * DB write so illegal/inconsistent moves are rejected server-side. Mirrors the Prisma enums.
 * Notably: no path un-pays an order, no re-entry resets a CHECKED_IN ticket, and a stall cannot
 * jump straight to BOOKED (must pass through HELD/PENDING) — backstopped by the DB partial-unique.
 */

type Transitions<T extends string> = Record<T, readonly T[]>;

export type StallStatus = "AVAILABLE" | "HELD" | "PENDING" | "BOOKED" | "BLOCKED";
export const STALL_TRANSITIONS: Transitions<StallStatus> = {
  AVAILABLE: ["HELD", "BLOCKED"],
  HELD: ["PENDING", "AVAILABLE"], // pay/submit, or release/TTL-expire
  PENDING: ["BOOKED", "AVAILABLE"], // approve, or reject/cancel
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

export type BookingStatus = "HELD" | "PENDING" | "BOOKED" | "REJECTED" | "CANCELLED";
export const BOOKING_TRANSITIONS: Transitions<BookingStatus> = {
  HELD: ["PENDING", "CANCELLED"],
  PENDING: ["BOOKED", "REJECTED", "CANCELLED"],
  BOOKED: ["CANCELLED"],
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
