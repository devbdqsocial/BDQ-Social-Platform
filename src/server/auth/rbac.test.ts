import { describe, expect, it } from "vitest";
import { can, type Permission, type Role, type Session } from "./guard";
import { canAccessSection, type ConsoleSection } from "@/lib/console-access";

/**
 * RBAC matrix tests (security.md §4, build-plan R0.4). The matrix is the spec — a failing row
 * here means authorization drifted, not that the test needs updating.
 */

const s = (role: Role, permissions: Permission[] = []): Session => ({ userId: "u", role, permissions });

const CUSTOMER = s("CUSTOMER");
const VENDOR = s("VENDOR");
const STAFF_NONE = s("STAFF");
const ADMIN = s("ADMIN");
const SUPER = s("SUPER_ADMIN");

describe("can() — role/permission resolution", () => {
  it("SUPER_ADMIN passes everything", () => {
    (["SUPER_ADMIN", "ADMIN", "VENDOR", "CUSTOMER"] as Role[]).forEach((need) => expect(can(SUPER, need)).toBe(true));
    (["CHECKIN", "PAYMENT_VIEW", "FINANCE_MANAGE"] as Permission[]).forEach((p) => expect(can(SUPER, p)).toBe(true));
  });

  it("ADMIN passes everything except strict SUPER_ADMIN", () => {
    expect(can(ADMIN, "SUPER_ADMIN")).toBe(false);
    expect(can(ADMIN, "ADMIN")).toBe(true);
    (["CHECKIN", "PAYMENT_VIEW", "VENDOR_MANAGE", "FINANCE_MANAGE"] as Permission[]).forEach((p) =>
      expect(can(ADMIN, p)).toBe(true));
  });

  it("STAFF passes only its granted atoms", () => {
    const scanner = s("STAFF", ["CHECKIN"]);
    expect(can(scanner, "CHECKIN")).toBe(true);
    expect(can(scanner, "PAYMENT_VIEW")).toBe(false);
    expect(can(scanner, "ADMIN")).toBe(false);
    expect(can(scanner, "SUPER_ADMIN")).toBe(false);
    expect(can(STAFF_NONE, "CHECKIN")).toBe(false);
  });

  it("CUSTOMER/VENDOR pass only their own role, never console capabilities", () => {
    expect(can(CUSTOMER, "CUSTOMER")).toBe(true);
    expect(can(VENDOR, "VENDOR")).toBe(true);
    (["CHECKIN", "PAYMENT_VIEW", "VENDOR_MANAGE", "FINANCE_MANAGE"] as Permission[]).forEach((p) => {
      expect(can(CUSTOMER, p)).toBe(false);
      expect(can(VENDOR, p)).toBe(false);
    });
    expect(can(CUSTOMER, "ADMIN")).toBe(false);
    expect(can(VENDOR, "ADMIN")).toBe(false);
  });
});

describe("canAccessSection() — console section matrix", () => {
  const sections: ConsoleSection[] = [
    "overview", "events", "map", "vendors", "checkin", "staff", "audit", "analytics",
    "coupons", "comps", "sponsors", "waitlist", "platform-waitlist", "ops", "tickets",
    "finance", "growth",
  ];

  it("SUPER_ADMIN reaches every section", () => {
    sections.forEach((sec) => expect(canAccessSection(SUPER, sec), sec).toBe(true));
  });

  it("ADMIN reaches everything except the audit viewer (SUPER_ADMIN-only, security §4)", () => {
    expect(canAccessSection(ADMIN, "audit")).toBe(false);
    sections.filter((x) => x !== "audit").forEach((sec) => expect(canAccessSection(ADMIN, sec), sec).toBe(true));
  });

  it("STAFF sections follow permission atoms exactly", () => {
    const expectFor = (perm: Permission, allowed: ConsoleSection[]) => {
      const session = s("STAFF", [perm]);
      sections.forEach((sec) => {
        const want = allowed.includes(sec) || sec === "overview";
        expect(canAccessSection(session, sec), `${perm} → ${sec}`).toBe(want);
      });
    };
    // sponsors has no gate (any console session) — included for every staff preset below.
    expectFor("CHECKIN", ["checkin", "sponsors"]);
    expectFor("PAYMENT_VIEW", ["analytics", "tickets", "sponsors"]);
    expectFor("VENDOR_VIEW", ["vendors", "growth", "sponsors"]);
    expectFor("CUSTOMER_VIEW", ["waitlist", "sponsors"]);
    expectFor("FINANCE_MANAGE", ["finance", "sponsors"]);
  });

  it("SUPER_ADMIN-only sections are closed to all staff regardless of atoms", () => {
    const fullStaff = s("STAFF", ["CHECKIN", "PAYMENT_VIEW", "VENDOR_MANAGE", "VENDOR_VIEW", "EVENT_VIEW", "CUSTOMER_VIEW", "FINANCE_MANAGE", "TICKETS_MANAGE"]);
    (["events", "map", "staff", "audit", "coupons", "comps", "ops", "platform-waitlist"] as ConsoleSection[]).forEach(
      (sec) => expect(canAccessSection(fullStaff, sec), sec).toBe(false),
    );
  });
});
