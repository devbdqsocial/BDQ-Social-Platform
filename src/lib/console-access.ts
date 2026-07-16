import type { Permission, Role } from "@/server/auth/guard";

/** Which admin-console section a session may reach. Pure — reused by the nav filter + page guards. */

export type ConsoleSection =
  | "overview" | "events" | "map" | "vendors" | "checkin" | "staff" | "audit"
  | "analytics" | "coupons" | "comps" | "sponsors" | "waitlist" | "platform-waitlist" | "ops"
  | "syshealth" | "tickets" | "finance" | "growth" | "content" | "settings" | "artists" | "legal";

const REQUIRES: Record<ConsoleSection, { superAdminOnly?: boolean; perm?: Permission }> = {
  overview: {},
  artists: { perm: "ARTIST_VIEW" }, // SUPER_ADMIN/ADMIN always; STAFF needs ARTIST_VIEW
  settings: {}, // hub is open to any console session; individual cards/pages gate themselves (My Profile vs org/super-admin)
  events: { superAdminOnly: true },
  map: { superAdminOnly: true },
  staff: { superAdminOnly: true },
  audit: { superAdminOnly: true },
  coupons: { superAdminOnly: true },
  comps: { superAdminOnly: true },
  sponsors: {},
  ops: { superAdminOnly: true },
  syshealth: { superAdminOnly: true }, // System Health — SUPER_ADMIN only (ADMIN excluded below, like audit)
  finance: { perm: "FINANCE_MANAGE" }, // SUPER_ADMIN/ADMIN always; STAFF needs FINANCE_MANAGE. P&L/settlement pages add requireAdminRole.
  analytics: { perm: "PAYMENT_VIEW" },
  tickets: { perm: "PAYMENT_VIEW" },
  waitlist: { perm: "CUSTOMER_VIEW" },
  "platform-waitlist": { superAdminOnly: true },
  vendors: { perm: "VENDOR_VIEW" },
  growth: { perm: "VENDOR_VIEW" },
  checkin: { perm: "CHECKIN" },
  content: { superAdminOnly: true }, // ADMIN+ manage offers/gallery/guide; STAFF blocked
  legal: { superAdminOnly: true }, // ADMIN+ manage documents & contracts; STAFF blocked
};

export function canAccessSection(o: { role: Role; permissions: Permission[] }, section: ConsoleSection): boolean {
  if (o.role === "SUPER_ADMIN") return true;
  if (o.role === "ADMIN") return section !== "audit" && section !== "syshealth";
  const r = REQUIRES[section];
  if (r.superAdminOnly) return false;
  if (r.perm) return o.permissions.includes(r.perm);
  return true; // overview: any console session
}
