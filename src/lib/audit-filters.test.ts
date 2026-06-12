import { describe, it, expect } from "vitest";
import { buildAuditWhere } from "./audit-filters";

describe("buildAuditWhere", () => {
  it("is empty with no filters", () => {
    expect(buildAuditWhere({})).toEqual({});
  });

  it("filters by entity + action", () => {
    expect(buildAuditWhere({ entity: "User", action: "admin.login" })).toEqual({
      entity: "User",
      action: "admin.login",
    });
  });

  it("builds an inclusive date range (to = end of day)", () => {
    const w = buildAuditWhere({ from: "2026-06-01", to: "2026-06-02" }) as {
      createdAt: { gte: Date; lte: Date };
    };
    expect(w.createdAt.gte).toEqual(new Date("2026-06-01T00:00:00"));
    expect(w.createdAt.lte).toEqual(new Date("2026-06-02T23:59:59.999"));
  });

  it("allows an open-ended range", () => {
    const w = buildAuditWhere({ from: "2026-06-01" }) as { createdAt: { gte: Date; lte?: Date } };
    expect(w.createdAt.gte).toEqual(new Date("2026-06-01T00:00:00"));
    expect(w.createdAt.lte).toBeUndefined();
  });
});
