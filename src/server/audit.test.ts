import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  logError: vi.fn(),
  runInDbTransaction: vi.fn((fn) => fn({ auditLog: { create: vi.fn((...args) => mocks.auditCreate(...args)) } })),
}));

vi.mock("@/server/db", () => ({
  runInDbTransaction: mocks.runInDbTransaction,
}));
vi.mock("@/lib/logger", () => ({ logError: mocks.logError }));

import { withAudit, withAuditTx } from "./audit";
import type { Session } from "@/server/auth/guard";

const session = { userId: "admin_1", role: "SUPER_ADMIN", permissions: [] } satisfies Session;

beforeEach(() => vi.clearAllMocks());

describe("withAudit", () => {
  it("returns the mutation result after writing the audit log", async () => {
    mocks.auditCreate.mockResolvedValue({});

    const result = await withAudit(session, { action: "UPDATE", entity: "Event", entityId: "event_1" }, async () => ({
      before: { status: "DRAFT" },
      run: async () => ({ result: "ok", after: { status: "PUBLISHED" } }),
    }));

    expect(result).toBe("ok");
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "admin_1",
        action: "UPDATE",
        entity: "Event",
        entityId: "event_1",
      }),
    });
  });

  it("fails closed when the audit log cannot be persisted", async () => {
    const error = new Error("audit unavailable");
    mocks.auditCreate.mockRejectedValue(error);

    await expect(
      withAudit(session, { action: "UPDATE", entity: "Event" }, async () => ({
        before: null,
        run: async () => ({ result: "ok", after: { status: "PUBLISHED" } }),
      })),
    ).rejects.toBe(error);

    expect(mocks.logError).toHaveBeenCalledWith("audit.persist", error, expect.objectContaining({ action: "UPDATE", entity: "Event" }));
  });

  it("passes the transaction client through withAuditTx", async () => {
    mocks.auditCreate.mockResolvedValue({});
    const result = await withAuditTx(session, { action: "UPDATE", entity: "Event" }, async (tx) => ({
      before: { id: "before", tx },
      run: async (runTx) => ({ result: runTx === tx, after: { id: "after" } }),
    }));

    expect(result).toBe(true);
  });
});
