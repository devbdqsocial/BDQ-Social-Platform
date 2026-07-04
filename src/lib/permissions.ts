import type { Permission } from "@/server/auth/guard";

/**
 * The one canonical staff-permission list + labels. Consumed by the Staff table chips, the
 * edit-access dialog, and the Roles page — so a permission is never omitted in one place and shown
 * in another. `label` is the descriptive checkbox copy; `short` is the compact chip copy.
 */
export const PERMISSIONS: { key: Permission; label: string; short: string }[] = [
  { key: "CHECKIN", label: "Check-in scanning", short: "Check-In" },
  { key: "VENDOR_VIEW", label: "View vendors", short: "Vendor View" },
  { key: "VENDOR_MANAGE", label: "Manage vendors", short: "Vendor Manage" },
  { key: "ARTIST_VIEW", label: "View artists", short: "Artist View" },
  { key: "ARTIST_MANAGE", label: "Manage artists", short: "Artist Manage" },
  { key: "EVENT_VIEW", label: "View events", short: "Event View" },
  { key: "CUSTOMER_VIEW", label: "View customers", short: "Customer View" },
  { key: "PAYMENT_VIEW", label: "Payments & analytics", short: "Payment View" },
  { key: "TICKETS_MANAGE", label: "Manage tickets (comps, cash sales)", short: "Tickets Manage" },
  { key: "FINANCE_MANAGE", label: "Manage finance ledger", short: "Finance Manage" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as Permission[];

const SHORT = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.short])) as Record<Permission, string>;

/** Compact chip label, e.g. "Payment View". Falls back to the raw key for anything unmapped. */
export const permissionShort = (p: string): string => SHORT[p as Permission] ?? p;
