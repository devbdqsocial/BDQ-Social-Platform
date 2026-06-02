import type { Permission } from "@/server/auth/guard";

/** Staff permission presets — a friendly bundle of permissions a SUPER_ADMIN assigns to a teammate. */

export type StaffPreset = "SCANNER_ONLY" | "SUPPORT" | "VENDOR_MANAGER" | "FINANCE";

export const STAFF_PRESETS: Record<StaffPreset, { label: string; description: string; permissions: Permission[] }> = {
  SCANNER_ONLY: { label: "Gate scanner", description: "Check guests in at the gate.", permissions: ["CHECKIN"] },
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
