import { describe, it, expect } from "vitest";
import { permissionsForPreset, isStaffPreset, STAFF_PRESET_KEYS } from "./staff-presets";
import { canAccessSection } from "./console-access";

describe("staff presets", () => {
  it("maps presets to permissions", () => {
    expect(permissionsForPreset("SCANNER_ONLY")).toEqual(["CHECKIN"]);
    expect(permissionsForPreset("VENDOR_MANAGER")).toContain("VENDOR_MANAGE");
    expect(permissionsForPreset("FINANCE")).toEqual(["PAYMENT_VIEW", "EVENT_VIEW"]);
  });

  it("validates preset keys", () => {
    expect(isStaffPreset("SCANNER_ONLY")).toBe(true);
    expect(isStaffPreset("nope")).toBe(false);
    expect(STAFF_PRESET_KEYS).toContain("SUPPORT");
  });
});

describe("console access", () => {
  const superAdmin = { role: "SUPER_ADMIN" as const, permissions: [] };
  const scanner = { role: "STAFF" as const, permissions: ["CHECKIN" as const] };

  it("lets SUPER_ADMIN reach everything", () => {
    for (const s of ["overview", "events", "map", "vendors", "checkin", "staff"] as const) {
      expect(canAccessSection(superAdmin, s)).toBe(true);
    }
  });

  it("limits a scanner to overview + check-in", () => {
    expect(canAccessSection(scanner, "overview")).toBe(true);
    expect(canAccessSection(scanner, "checkin")).toBe(true);
    expect(canAccessSection(scanner, "events")).toBe(false);
    expect(canAccessSection(scanner, "map")).toBe(false);
    expect(canAccessSection(scanner, "vendors")).toBe(false);
    expect(canAccessSection(scanner, "staff")).toBe(false);
  });

  it("grants vendors to a vendor-view staff", () => {
    const vm = { role: "STAFF" as const, permissions: ["VENDOR_VIEW" as const] };
    expect(canAccessSection(vm, "vendors")).toBe(true);
    expect(canAccessSection(vm, "checkin")).toBe(false);
  });
});
