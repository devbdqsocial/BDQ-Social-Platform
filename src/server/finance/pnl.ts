import "server-only";
import { db } from "@/server/db";

/**
 * Event P&L / ROI. Money is integer paise; percentages are returned as ratios (0.25 = 25%).
 *
 * Net revenue = collected − Razorpay fee/tax. Net profit = net revenue − approved/paid expenses.
 * The pure `computePnl` holds all the arithmetic (unit-tested); `getEventPnl` only feeds it DB rows.
 */

export interface PnlInputs {
  ticketGross: number;
  ticketFees: number;
  stallGross: number;
  stallFees: number;
  sponsorship: number;
  discount: number;        // foregone via discounts
  compValue: number;       // foregone via comps (face value)
  expensesByCategory: { category: string; amountPaise: number }[];
  soldTickets: number;     // non-comp tickets (denominator for avg price)
  checkedIn: number;
  distinctCustomers: number;
}

export interface PnlStream {
  stream: "Tickets" | "Stalls" | "Sponsorship";
  gross: number;
  fees: number;
  net: number;
}

export interface Pnl {
  streams: PnlStream[];
  grossRevenue: number;
  totalFees: number;
  netRevenue: number;
  foregone: number;
  expensesTotal: number;
  expensesByCategory: { category: string; amountPaise: number }[];
  netProfit: number;
  marginPct: number;        // netProfit / grossRevenue
  roiPct: number | null;    // netProfit / expensesTotal
  unit: {
    marketingSpend: number;
    cac: number | null;            // marketing / distinct customers
    avgTicketPrice: number;        // ticketGross / soldTickets
    revenuePerAttendee: number;    // netRevenue / checkedIn (or soldTickets)
    breakEvenTickets: number | null;
  };
}

export function computePnl(i: PnlInputs): Pnl {
  const streams: PnlStream[] = [
    { stream: "Tickets", gross: i.ticketGross, fees: i.ticketFees, net: i.ticketGross - i.ticketFees },
    { stream: "Stalls", gross: i.stallGross, fees: i.stallFees, net: i.stallGross - i.stallFees },
    { stream: "Sponsorship", gross: i.sponsorship, fees: 0, net: i.sponsorship },
  ];
  const grossRevenue = streams.reduce((s, x) => s + x.gross, 0);
  const totalFees = streams.reduce((s, x) => s + x.fees, 0);
  const netRevenue = streams.reduce((s, x) => s + x.net, 0);
  const expensesTotal = i.expensesByCategory.reduce((s, x) => s + x.amountPaise, 0);
  const netProfit = netRevenue - expensesTotal;

  const marketingSpend = i.expensesByCategory.find((x) => x.category === "MARKETING")?.amountPaise ?? 0;
  const avgTicketPrice = i.soldTickets ? Math.round(i.ticketGross / i.soldTickets) : 0;
  const attendeeBase = i.checkedIn || i.soldTickets;

  return {
    streams,
    grossRevenue,
    totalFees,
    netRevenue,
    foregone: i.discount + i.compValue,
    expensesTotal,
    expensesByCategory: i.expensesByCategory,
    netProfit,
    marginPct: grossRevenue ? netProfit / grossRevenue : 0,
    roiPct: expensesTotal ? netProfit / expensesTotal : null,
    unit: {
      marketingSpend,
      cac: i.distinctCustomers ? Math.round(marketingSpend / i.distinctCustomers) : null,
      avgTicketPrice,
      revenuePerAttendee: attendeeBase ? Math.round(netRevenue / attendeeBase) : 0,
      breakEvenTickets: avgTicketPrice ? Math.ceil(expensesTotal / avgTicketPrice) : null,
    },
  };
}

/** Vendor-level expense breakdown for the drill-down table (separate from the pure compute). */
export async function getExpensesByVendor(eventId: string) {
  const groups = await db.expense.groupBy({
    by: ["vendorProfileId"],
    where: { eventId, status: { in: ["APPROVED", "PAID"] }, vendorProfileId: { not: null } },
    _sum: { amountPaise: true },
  });
  const ids = groups.map((g) => g.vendorProfileId).filter((x): x is string => !!x);
  const vendors = ids.length
    ? await db.vendorProfile.findMany({ where: { id: { in: ids } }, select: { id: true, brandName: true } })
    : [];
  const nameById = new Map(vendors.map((v) => [v.id, v.brandName]));
  return groups
    .map((g) => ({ vendor: nameById.get(g.vendorProfileId!) ?? "—", amountPaise: g._sum.amountPaise ?? 0 }))
    .sort((a, b) => b.amountPaise - a.amountPaise);
}

export async function getEventPnl(eventId: string): Promise<Pnl> {
  const paidWhere = { eventId, status: "PAID" as const };

  const [orderAgg, ticketFeeAgg, stallAgg, sponsorAgg, expenseGroups, soldTickets, comps, checkedIn, customers] =
    await Promise.all([
      db.order.aggregate({ where: paidWhere, _sum: { total: true, discount: true } }),
      db.payment.aggregate({
        where: { status: "CAPTURED", order: { eventId } },
        _sum: { feePaise: true, taxPaise: true },
      }),
      db.payment.aggregate({
        where: { status: "CAPTURED", booking: { eventId } },
        _sum: { amount: true, feePaise: true, taxPaise: true },
      }),
      db.sponsorship.aggregate({ where: { eventId, status: "PAID" }, _sum: { amountPaise: true } }),
      db.expense.groupBy({
        by: ["category"],
        where: { eventId, status: { in: ["APPROVED", "PAID"] } },
        _sum: { amountPaise: true },
      }),
      db.ticket.count({ where: { order: { eventId }, isComp: false } }),
      db.ticket.findMany({
        where: { order: { eventId }, isComp: true },
        select: { ticketType: { select: { priceInPaise: true } } },
      }),
      db.ticket.count({ where: { order: { eventId }, status: "CHECKED_IN" } }),
      db.order.findMany({ where: paidWhere, select: { userId: true }, distinct: ["userId"] }),
    ]);

  const ticketFees = (ticketFeeAgg._sum.feePaise ?? 0) + (ticketFeeAgg._sum.taxPaise ?? 0);
  const stallFees = (stallAgg._sum.feePaise ?? 0) + (stallAgg._sum.taxPaise ?? 0);
  const compValue = comps.reduce((s, t) => s + (t.ticketType?.priceInPaise ?? 0), 0);

  return computePnl({
    ticketGross: orderAgg._sum.total ?? 0,
    ticketFees,
    stallGross: stallAgg._sum.amount ?? 0,
    stallFees,
    sponsorship: sponsorAgg._sum.amountPaise ?? 0,
    discount: orderAgg._sum.discount ?? 0,
    compValue,
    expensesByCategory: expenseGroups.map((g) => ({ category: g.category, amountPaise: g._sum.amountPaise ?? 0 })),
    soldTickets,
    checkedIn,
    distinctCustomers: customers.length,
  });
}
