import { afterAll, describe, expect, it } from "vitest";

describe.runIf(process.env.RUN_DB_TESTS === "1")("atomic audit logging", () => {
  it("rolls back the mutation when audit persistence fails", async () => {
    const { db } = await import("@/server/db");
    const { withAudit } = await import("./audit");
    const key = `audit-rollback-${Date.now()}`;
    const session = { userId: `missing-${key}`, role: "SUPER_ADMIN" as const, permissions: [] };

    await expect(
      withAudit(session, { action: "UPDATE_SETTING", entity: "SystemSetting", entityId: key }, async () => ({
        before: null,
        run: async () => {
          const setting = await db.systemSetting.create({ data: { key, value: "written-before-audit-fails" } });
          return { result: setting, after: setting };
        },
      })),
    ).rejects.toThrow();

    expect(await db.systemSetting.findUnique({ where: { key } })).toBeNull();
  });

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
