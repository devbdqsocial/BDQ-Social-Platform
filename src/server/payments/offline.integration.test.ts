import { afterAll, describe, expect, it } from "vitest";

describe.runIf(process.env.RUN_DB_TESTS === "1")("offline stall payment", () => {
  it("captures exact pending stall payment and blocks duplicate references", async () => {
    const { db } = await import("@/server/db");
    const { OfflinePaymentError, recordOfflineStallPayment } = await import("./offline");

    const tag = `offline-stall-${Date.now()}`;
    const admin = await db.user.create({ data: { phone: `+9160${Date.now() % 100000000}`, role: "SUPER_ADMIN" } });
    const user = await db.user.create({ data: { phone: `+9161${Date.now() % 100000000}`, role: "VENDOR" } });
    const vendor = await db.vendorProfile.create({ data: { userId: user.id, brandName: `Brand ${tag}`, approvalStatus: "APPROVED" } });
    const event = await db.event.create({
      data: { name: `Event ${tag}`, slug: tag, startsAt: new Date(Date.now() + 86400000), endsAt: new Date(Date.now() + 90000000) },
    });
    const type = await db.stallTypeDef.create({
      data: { eventId: event.id, name: `Type ${tag}`, widthFt: 10, heightFt: 10, priceInPaise: 125000, color: "#111111" },
    });
    const stall = await db.stall.create({
      data: { eventId: event.id, stallTypeId: type.id, label: `A-${tag}`, xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, status: "HELD" },
    });
    const stall2 = await db.stall.create({
      data: { eventId: event.id, stallTypeId: type.id, label: `B-${tag}`, xFt: 10, yFt: 0, widthFt: 10, heightFt: 10, status: "HELD" },
    });
    const booking = await db.booking.create({
      data: { eventId: event.id, stallId: stall.id, vendorProfileId: vendor.id, status: "PENDING_PAYMENT" },
    });
    const booking2 = await db.booking.create({
      data: { eventId: event.id, stallId: stall2.id, vendorProfileId: vendor.id, status: "PENDING_PAYMENT" },
    });
    const session = { userId: admin.id, role: "SUPER_ADMIN" as const, permissions: ["VENDOR_MANAGE" as const] };

    try {
      await expect(
        recordOfflineStallPayment(session, { bookingId: booking.id, amountPaise: 124999, gatewayRef: `${tag}-bad`, note: "wrong amount" }),
      ).rejects.toThrow(new OfflinePaymentError("AMOUNT_MISMATCH"));

      const result = await recordOfflineStallPayment(session, { bookingId: booking.id, amountPaise: 125000, gatewayRef: `${tag}-utr`, note: "cash received" });
      expect(result.bookingId).toBe(booking.id);
      expect((await db.booking.findUnique({ where: { id: booking.id } }))?.status).toBe("BOOKED");
      expect((await db.stall.findUnique({ where: { id: stall.id } }))?.status).toBe("BOOKED");
      expect(await db.payment.count({ where: { bookingId: booking.id, gatewayRef: `${tag}-utr`, amount: 125000, status: "CAPTURED" } })).toBe(1);
      await expect(
        recordOfflineStallPayment(session, { bookingId: booking2.id, amountPaise: 125000, gatewayRef: `${tag}-utr`, note: "duplicate utr" }),
      ).rejects.toThrow(new OfflinePaymentError("DUPLICATE_REFERENCE"));
    } finally {
      await db.auditLog.deleteMany({ where: { actorId: admin.id } });
      await db.payment.deleteMany({ where: { bookingId: { in: [booking.id, booking2.id] } } });
      await db.booking.deleteMany({ where: { id: { in: [booking.id, booking2.id] } } });
      await db.stall.deleteMany({ where: { id: { in: [stall.id, stall2.id] } } });
      await db.stallTypeDef.deleteMany({ where: { id: type.id } });
      await db.event.deleteMany({ where: { id: event.id } });
      await db.vendorProfile.deleteMany({ where: { id: vendor.id } });
      await db.user.deleteMany({ where: { id: { in: [admin.id, user.id] } } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
