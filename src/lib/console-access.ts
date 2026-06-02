import type { Permission, Role } from "@/server/auth/guard";

/** Which admin-console section a session may reach. Pure — reused by the nav filter + page guards. */

export type ConsoleSection =
  | "overview" | "events" | "map" | "vendors" | "checkin" | "staff" | "audit"
  | "analytics" | "coupons" | "comps" | "sponsors" | "waitlist" | "ops";

const REQUIRES: Record<ConsoleSection, { superAdminOnly?: boolean; perm?: Permission }> = {
  overview: {},
  events: { superAdminOnly: true },
  map: { superAdminOnly: true },
  staff: { superAdminOnly: true },
  audit: { superAdminOnly: true },
  coupons: { superAdminOnly: true },
  comps: { superAdminOnly: true },
  sponsors: { superAdminOnly: true },
  ops: { superAdminOnly: true },
  analytics: { perm: "PAYMENT_VIEW" },
  waitlist: { perm: "CUSTOMER_VIEW" },
  vendors: { perm: "VENDOR_VIEW" },
  checkin: { perm: "CHECKIN" },
};

export function canAccessSection(o: { role: Role; permissions: Permission[] }, section: ConsoleSection): boolean {
  if (o.role === "SUPER_ADMIN") return true;
  const r = REQUIRES[section];
  if (r.superAdminOnly) return false;
  if (r.perm) return o.permissions.includes(r.perm);
  return true; // overview: any console session
}
