import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { getEventPnl, getExpensesByVendor } from "@/server/finance/pnl";
import { getReceivables, getCashByRecorder } from "@/server/finance/receivables";
import { getActiveEvent } from "@/server/admin/event-context";
import { formatPaise } from "@/lib/utils";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { StatBar } from "@/components/charts/mini";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "P&L / ROI" };
export const dynamic = "force-dynamic"; // always fresh — finance figures change with every payment

const pct = (r: number | null) => (r == null ? "—" : `${(r * 100).toFixed(1)}%`);

export default async function PnlPage() {
  await requireAdminRole();
  const { active } = await getActiveEvent();
  if (!active) {
    return (
      <div className="space-y-8">
        <PageHeader title="P&L / ROI" description="Profit and loss per event." />
        <p className="text-sm text-muted-foreground">Create an event to see its P&L.</p>
      </div>
    );
  }

  const [pnl, byVendor, receivables, cash] = await Promise.all([
    getEventPnl(active.id),
    getExpensesByVendor(active.id),
    getReceivables(active.id),
    getCashByRecorder(active.id),
  ]);

  const maxStream = Math.max(1, ...pnl.streams.map((s) => s.net));
  const maxCat = Math.max(1, ...pnl.expensesByCategory.map((c) => c.amountPaise));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="P&L / ROI" description={`Profit and loss for ${active.name}. Revenue is net of Razorpay fees.`} />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/export/pnl?eventId=${active.id}`}>Download CSV</a>
          </Button>
          <PrintButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Net profit" value={formatPaise(pnl.netProfit)} sub={pnl.netProfit >= 0 ? "In the black" : "In the red"} />
        <KpiCard label="Net revenue" value={formatPaise(pnl.netRevenue)} sub={`${formatPaise(pnl.grossRevenue)} gross − ${formatPaise(pnl.totalFees)} fees`} />
        <KpiCard label="Margin" value={pct(pnl.marginPct)} sub="Net profit / gross revenue" />
        <KpiCard label="ROI" value={pct(pnl.roiPct)} sub="Net profit / expenses" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Profit by stream" description="Revenue net of fees, per stream.">
          <div className="space-y-4">
            {pnl.streams.map((s) => (
              <StatBar key={s.stream} label={s.stream} value={s.net} max={maxStream} tone="bg-secondary" />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Expenses by category" description={`${formatPaise(pnl.expensesTotal)} approved/paid.`}>
          {pnl.expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded for this event yet.</p>
          ) : (
            <div className="space-y-3">
              {pnl.expensesByCategory
                .slice()
                .sort((a, b) => b.amountPaise - a.amountPaise)
                .map((c) => (
                  <StatBar key={c.category} label={c.category.replace(/_/g, " ")} value={c.amountPaise} max={maxCat} tone="bg-primary" />
                ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Foregone revenue" value={formatPaise(pnl.foregone)} sub="Discounts + comps given away" />
        <KpiCard label="Avg ticket price" value={formatPaise(pnl.unit.avgTicketPrice)} sub="Gross / tickets sold" />
        <KpiCard label="Revenue / attendee" value={formatPaise(pnl.unit.revenuePerAttendee)} sub="Net / checked-in" />
        <KpiCard label="Break-even tickets" value={pnl.unit.breakEvenTickets ?? "—"} sub={`CAC ${pnl.unit.cac != null ? formatPaise(pnl.unit.cac) : "—"}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Spend by vendor" description="Vendor payouts & costs.">
          {byVendor.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vendor-linked expenses.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {byVendor.map((v) => (
                <li key={v.vendor} className="flex items-center justify-between py-2">
                  <span>{v.vendor}</span>
                  <span className="font-medium">{formatPaise(v.amountPaise)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Accounts receivable" description={`${formatPaise(receivables.totalPaise)} owed.`}>
          {receivables.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {receivables.items.map((r) => (
                <li key={r.bookingId} className="flex items-center justify-between py-2">
                  <span>{r.vendor} · {r.stall}</span>
                  <span className="font-medium">{formatPaise(r.owedPaise)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Cash in hand" description={`${formatPaise(cash.totalPaise)} collected offline.`}>
          {cash.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offline cash recorded.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {cash.rows.map((r) => (
                <li key={r.recorder} className="flex items-center justify-between py-2">
                  <span>{r.recorder} <span className="text-muted-foreground">({r.count})</span></span>
                  <span className="font-medium">{formatPaise(r.amountPaise)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
