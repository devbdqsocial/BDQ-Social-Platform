/** Shared status → Tailwind badge-class mappings for admin tables. */

export const ORDER_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID:    "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-red-100 text-red-700",
};

export const VENDOR_STATUS_BADGE: Record<string, string> = {
  SUBMITTED:    "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED:     "bg-green-100 text-green-800",
  REJECTED:     "bg-red-100 text-red-700",
};

export const BOOKING_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-gray-100 text-gray-500",
  HELD:      "bg-yellow-100 text-yellow-800",
  PENDING:   "bg-blue-100 text-blue-800",
  BOOKED:    "bg-green-100 text-green-800",
  BLOCKED:   "bg-red-100 text-red-700",
};

export const TICKET_STATUS_BADGE: Record<string, string> = {
  VALID:       "bg-green-100 text-green-800",
  CHECKED_IN:  "bg-blue-100 text-blue-800",
  CANCELLED:   "bg-red-100 text-red-700",
};
