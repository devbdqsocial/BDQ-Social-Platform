import { afterAll, describe, expect, it } from "vitest";

/**
 * Needs a migrated database.
 * Run locally: RUN_DB_TESTS=1 npx vitest run active-booking.integration
 */
describe.runIf(process.env.RUN_DB_TESTS === "1")("active booking uniqueness", () => {
  it("allows only one RESERVED/PENDING_PAYMENT/BOOKED booking per stall", async () => {
    const { db } = await import("@/server/db");

    const tag = `active-booking-${Date.now()}`;
    const user1 = await db.user.create({ data: { phone: `+9191${Date.now() % 100000000}`, role: "VENDOR" } });
    const user2 = await db.user.create({ data: { phone: `+9192${Date.now() % 100000000}`, role: "VENDOR" } });
    const [vendor1, vendor2] = await Promise.all([
      db.vendorProfile.create({ data: { userId: user1.id, brandName: `A ${tag}`, approvalStatus: "SUBMITTED" } }),
      db.vendorProfile.create({ data: { userId: user2.id, brandName: `B ${tag}`, approvalStatus: "SUBMITTED" } }),
    ]);
    const event = await db.event.create({
      data: {
        name: `Event ${tag}`,
        slug: tag,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
      },
    });
    const stall = await db.stall.create({
      data: { eventId: event.id, label: `S-${tag}`, xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, status: "HELD" },
    });

    try {
      const results = await Promise.allSettled([
        db.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: vendor1.id, status: "RESERVED" } }),
        db.booking.create({ data: { eventId: event.id, stallId: stall.id, vendorProfileId: vendor2.id, status: "PENDING_PAYMENT" } }),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await db.booking.count({ where: { stallId: stall.id, status: { in: ["RESERVED", "PENDING_PAYMENT", "BOOKED"] } } })).toBe(1);
    } finally {
      await db.booking.deleteMany({ where: { stallId: stall.id } });
      await db.stall.delete({ where: { id: stall.id } });
      await db.event.delete({ where: { id: event.id } });
      await db.vendorProfile.deleteMany({ where: { id: { in: [vendor1.id, vendor2.id] } } });
      await db.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
    }
  }, 30000);

  it("allows only one concurrent admin assignment per stall", async () => {
    const { db } = await import("@/server/db");
    const { assignStallByAdmin } = await import("@/server/vendors/admin-service");
    const tag = `admin-assign-${Date.now()}`;
    const admin = await db.user.create({ data: { phone: `+9188${Date.now() % 100000000}`, role: "SUPER_ADMIN" } });
    const user1 = await db.user.create({ data: { phone: `+9171${Date.now() % 100000000}`, role: "VENDOR" } });
    const user2 = await db.user.create({ data: { phone: `+9172${Date.now() % 100000000}`, role: "VENDOR" } });
    const [vendor1, vendor2] = await Promise.all([
      db.vendorProfile.create({ data: { userId: user1.id, brandName: `A ${tag}`, approvalStatus: "APPROVED" } }),
      db.vendorProfile.create({ data: { userId: user2.id, brandName: `B ${tag}`, approvalStatus: "APPROVED" } }),
    ]);
    const event = await db.event.create({
      data: {
        name: `Event ${tag}`,
        slug: tag,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
      },
    });
    const stall = await db.stall.create({
      data: { eventId: event.id, label: `S-${tag}`, xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, status: "AVAILABLE" },
    });
    const session = { userId: admin.id, role: "SUPER_ADMIN" as const, permissions: ["VENDOR_MANAGE" as const] };

    try {
      const results = await Promise.allSettled([
        assignStallByAdmin(session, vendor1.id, stall.id),
        assignStallByAdmin(session, vendor2.id, stall.id),
      ]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await db.booking.count({ where: { stallId: stall.id, status: { in: ["RESERVED", "PENDING_PAYMENT", "BOOKED"] } } })).toBe(1);
      expect((await db.booking.findFirst({ where: { stallId: stall.id }, select: { status: true } }))?.status).toBe("PENDING_PAYMENT");
    } finally {
      await db.auditLog.deleteMany({ where: { actorId: admin.id } });
      await db.booking.deleteMany({ where: { stallId: stall.id } });
      await db.stall.delete({ where: { id: stall.id } });
      await db.event.delete({ where: { id: event.id } });
      await db.vendorProfile.deleteMany({ where: { id: { in: [vendor1.id, vendor2.id] } } });
      await db.user.deleteMany({ where: { id: { in: [admin.id, user1.id, user2.id] } } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
