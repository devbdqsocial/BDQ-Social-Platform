import type { Permission } from "@/server/auth/guard";

/** Staff permission presets — a friendly bundle of permissions a SUPER_ADMIN assigns to a teammate. */

export type StaffPreset = "SCANNER_ONLY" | "BOX_OFFICE" | "SUPPORT" | "VENDOR_MANAGER" | "FINANCE";

export const STAFF_PRESETS: Record<StaffPreset, { label: string; description: string; permissions: Permission[] }> = {
  SCANNER_ONLY: { label: "Entry Scanner", description: "Check guests in at the gate.", permissions: ["CHECKIN"] },
  BOX_OFFICE: { label: "Box Office Cashier", description: "Issue tickets and record offline payments.", permissions: ["CHECKIN", "CUSTOMER_VIEW", "PAYMENT_VIEW", "TICKETS_MANAGE"] },
  SUPPORT: { label: "Support desk", description: "View vendors, customers, and events.", permissions: ["VENDOR_VIEW", "CUSTOMER_VIEW", "EVENT_VIEW"] },
  VENDOR_MANAGER: { label: "Vendor manager", description: "Review and approve vendor applications.", permissions: ["VENDOR_MANAGE", "VENDOR_VIEW", "EVENT_VIEW"] },
  FINANCE: { label: "Finance", description: "View payments and events.", permissions: ["PAYMENT_VIEW", "EVENT_VIEW"] },
};

export const STAFF_PRESET_KEYS = Object.keys(STAFF_PRESETS) as StaffPreset[];

export function isStaffPreset(v: string): v is StaffPreset {
  return v in STAFF_PRESETS;
}

export function permissionsForPreset(preset: StaffPreset): Permission[] {
  return STAFF_PRESETS[preset].permissions;
}
