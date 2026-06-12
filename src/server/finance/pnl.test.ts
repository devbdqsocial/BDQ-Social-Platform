import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { computePnl, getEventPnl, type PnlInputs } from "./pnl";
import { PrismaClient } from "@prisma/client";

const base: PnlInputs = {
  ticketGross: 100000,
  ticketFees: 2000,
  stallGross: 50000,
  stallFees: 1000,
  sponsorship: 30000,
  discount: 5000,
  compValue: 2000,
  expensesByCategory: [
    { category: "MARKETING", amountPaise: 10000 },
    { category: "VENUE", amountPaise: 20000 },
  ],
  soldTickets: 10,
  checkedIn: 8,
  distinctCustomers: 5,
};

describe("computePnl", () => {
  it("nets fees off each revenue stream", () => {
    const p = computePnl(base);
    expect(p.streams).toEqual([
      { stream: "Tickets", gross: 100000, fees: 2000, net: 98000 },
      { stream: "Stalls", gross: 50000, fees: 1000, net: 49000 },
      { stream: "Sponsorship", gross: 30000, fees: 0, net: 30000 },
    ]);
    expect(p.grossRevenue).toBe(180000);
    expect(p.totalFees).toBe(3000);
    expect(p.netRevenue).toBe(177000);
  });

  it("net profit = net revenue − expenses; margin and ROI derived from it", () => {
    const p = computePnl(base);
    expect(p.expensesTotal).toBe(30000);
    expect(p.netProfit).toBe(147000);
    expect(p.marginPct).toBeCloseTo(147000 / 180000, 6);
    expect(p.roiPct).toBeCloseTo(4.9, 6);
  });

  it("foregone revenue = discounts + comp face value", () => {
    expect(computePnl(base).foregone).toBe(7000);
  });

  it("unit economics: CAC, avg ticket price, revenue/attendee, break-even", () => {
    const u = computePnl(base).unit;
    expect(u.marketingSpend).toBe(10000);
    expect(u.cac).toBe(2000); // 10000 / 5
    expect(u.avgTicketPrice).toBe(10000); // 100000 / 10
    expect(u.revenuePerAttendee).toBe(22125); // 177000 / 8 checked-in
    expect(u.breakEvenTickets).toBe(3); // ceil(30000 / 10000)
  });

  it("falls back to sold tickets when nobody has checked in", () => {
    const u = computePnl({ ...base, checkedIn: 0 }).unit;
    expect(u.revenuePerAttendee).toBe(17700); // 177000 / 10 sold
  });

  it("guards divide-by-zero: no expenses → ROI null, no sales → margin 0, no tickets → no break-even", () => {
    const empty = computePnl({
      ...base,
      ticketGross: 0,
      stallGross: 0,
      sponsorship: 0,
      soldTickets: 0,
      distinctCustomers: 0,
      expensesByCategory: [],
    });
    expect(empty.roiPct).toBeNull();
    expect(empty.marginPct).toBe(0);
    expect(empty.unit.avgTicketPrice).toBe(0);
    expect(empty.unit.breakEvenTickets).toBeNull();
    expect(empty.unit.cac).toBeNull();
  });
});

describe("getEventPnl Integration", () => {
  const db = new PrismaClient();
  const testEventId = "test_pnl_ev_id";

  async function cleanUp() {
    await db.sponsor.deleteMany({ where: { eventId: testEventId } });
    await db.order.deleteMany({ where: { eventId: testEventId } });
    await db.event.deleteMany({ where: { id: testEventId } });
  }

  beforeAll(async () => {
    await cleanUp();
    await db.event.create({
      data: {
        id: testEventId,
        name: "Test Event for P&L",
        slug: "test-event-pnl",
        startsAt: new Date(),
        endsAt: new Date(),
        status: "PUBLISHED",
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("calculates sponsorship revenue correctly using only PAID unified sponsors", async () => {
    // Create one PAID sponsor and one PROPOSED sponsor
    await db.sponsor.create({
      data: {
        eventId: testEventId,
        name: "Paid Sponsor Co.",
        tier: "TITLE",
        amountPaise: 500000, // ₹5000
        status: "PAID",
      },
    });

    await db.sponsor.create({
      data: {
        eventId: testEventId,
        name: "Proposed Sponsor Co.",
        tier: "ASSOCIATE",
        amountPaise: 300000, // ₹3000
        status: "PROPOSED",
      },
    });

    const pnl = await getEventPnl(testEventId);

    // Expect gross sponsorship revenue to be ₹5000 (500000 paise) from Paid Sponsor Co. only
    expect(pnl.grossRevenue).toBe(500000);
    const sponsorStream = pnl.streams.find((s) => s.stream === "Sponsorship");
    expect(sponsorStream).toBeDefined();
    expect(sponsorStream?.gross).toBe(500000);
    expect(sponsorStream?.net).toBe(500000);
  });
});
