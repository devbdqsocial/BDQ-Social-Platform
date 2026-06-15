import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * Vendor-payment reconcile safety net (launch-readiness-report §5/§7) — needs a real database.
 * Run locally:  RUN_DB_TESTS=1 (DATABASE_URL set) vitest run reconcile-vendor.integration
 * Skipped in CI. Razorpay's fetchCapturedPayment is mocked (selective by gatewayOrderId).
 *
 * Proves: a captured-but-unfulfilled stall booking + add-on order get fulfilled idempotently, and a
 * lapsed (unpaid, payBy past) booking is cancelled + its stall freed.
 */
vi.mock("@/lib/razorpay", async (orig) => ({ ...(await orig()), fetchCapturedPayment: vi.fn() }));

describe.runIf(process.env.RUN_DB_TESTS === "1")("reconcileVendorPayments (integration)", () => {
  it("recovers captured stall + add-on payments and cancels lapsed windows", async () => {
    const { db } = await import("@/server/db");
    const { fetchCapturedPayment } = await import("@/lib/razorpay");
    const { reconcileVendorPayments } = await import("./tasks");

    const tag = `rv-${Date.now()}`;
    const old = new Date(Date.now() - 10 * 60 * 1000);
    const user = await db.user.create({ data: { phone: `+9197${Date.now() % 100000000}`, role: "VENDOR" } });
    const vp = await db.vendorProfile.create({ data: { userId: user.id, brandName: `B ${tag}`, approvalStatus: "APPROVED" } });
    const event = await db.event.create({ data: { name: `E ${tag}`, slug: tag, startsAt: new Date(Date.now() + 7 * 86400000), endsAt: new Date(Date.now() + 8 * 86400000), status: "LIVE" } });
    const mkStall = (label: string) => db.stall.create({ data: { eventId: event.id, label, xFt: 0, yFt: 0, widthFt: 10, heightFt: 10, status: "HELD", priceInPaise: 50000 } });
    const [s1, s2] = await Promise.all([mkStall(`${tag}-A`), mkStall(`${tag}-B`)]);

    const paid = await db.booking.create({ data: { eventId: event.id, stallId: s1.id, vendorProfileId: vp.id, status: "PENDING_PAYMENT", gatewayOrderId: `${tag}-gw-paid`, payBy: new Date(Date.now() + 86400000), createdAt: old } });
    const lapsed = await db.booking.create({ data: { eventId: event.id, stallId: s2.id, vendorProfileId: vp.id, status: "PENDING_PAYMENT", gatewayOrderId: `${tag}-gw-lapsed`, payBy: new Date(Date.now() - 86400000), createdAt: old } });
    const addOn = await db.stallAddOn.create({ data: { eventId: event.id, name: `Power ${tag}`, pricePaise: 30000 } });
    const aoo = await db.bookingAddOnOrder.create({ data: { bookingId: paid.id, totalPaise: 30000, gatewayOrderId: `${tag}-gw-addon`, createdAt: old, lines: { create: { addOnId: addOn.id, qty: 1, pricePaise: 30000 } } } });

    vi.mocked(fetchCapturedPayment).mockImplementation(async (orderId: string) => {
      if (orderId === `${tag}-gw-paid`) return { id: `${tag}-pay-1`, feePaise: 1000, taxPaise: 180 };
      if (orderId === `${tag}-gw-addon`) return { id: `${tag}-pay-2`, feePaise: 600, taxPaise: 108 };
      return null; // the lapsed booking has no captured payment
    });

    try {
      const res = await reconcileVendorPayments();
      expect(res.fulfilled).toBe(2);
      expect(res.released).toBeGreaterThanOrEqual(1);

      expect((await db.booking.findUnique({ where: { id: paid.id } }))?.status).toBe("BOOKED");
      expect((await db.stall.findUnique({ where: { id: s1.id } }))?.status).toBe("BOOKED");
      expect((await db.bookingAddOnOrder.findUnique({ where: { id: aoo.id } }))?.status).toBe("PAID");
      expect(await db.payment.count({ where: { gatewayRef: { in: [`${tag}-pay-1`, `${tag}-pay-2`] } } })).toBe(2);

      expect((await db.booking.findUnique({ where: { id: lapsed.id } }))?.status).toBe("CANCELLED");
      expect((await db.stall.findUnique({ where: { id: s2.id } }))?.status).toBe("AVAILABLE");

      // idempotent re-run — no duplicate payments
      await reconcileVendorPayments();
      expect(await db.payment.count({ where: { gatewayRef: { in: [`${tag}-pay-1`, `${tag}-pay-2`] } } })).toBe(2);
    } finally {
      await db.payment.deleteMany({ where: { OR: [{ bookingId: paid.id }, { addOnOrderId: aoo.id }] } });
      await db.bookingAddOn.deleteMany({ where: { orderId: aoo.id } });
      await db.bookingAddOnOrder.delete({ where: { id: aoo.id } });
      await db.stallAddOn.delete({ where: { id: addOn.id } });
      await db.booking.deleteMany({ where: { id: { in: [paid.id, lapsed.id] } } });
      await db.stall.deleteMany({ where: { id: { in: [s1.id, s2.id] } } });
      await db.event.delete({ where: { id: event.id } });
      await db.vendorProfile.delete({ where: { id: vp.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  }, 30000);

  afterAll(async () => {
    const { db } = await import("@/server/db");
    await db.$disconnect();
  });
});
