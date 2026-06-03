import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { getAnalytics } from "@/server/analytics/service";
import { formatPaise } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { RevenueAreaChart } from "@/components/charts/dashboard-charts";

export const metadata: Metadata = { title: "Revenue" };

export default async function RevenuePage() {
  await requireSuperAdmin();
  const { active } = await getActiveEvent();
  const a = await getAnalytics(active?.id);
  const k = a.kpis;

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue" description={active ? `Money in for ${active.name} — tickets and stalls.` : "Across all events."} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total revenue" value={formatPaise(k.totalRevenue)} trend={a.trend.map((t) => t.revenue)} sub="tickets + stalls" />
        <KpiCard label="Ticket revenue" value={formatPaise(k.grossTicketRevenue)} sub={`${k.paidOrders} paid orders`} />
        <KpiCard label="Stall revenue" value={formatPaise(k.stallRevenue)} sub="captured stall payments" />
        <KpiCard label="Discounts given" value={formatPaise(k.totalDiscount)} />
        <KpiCard label="Avg order value" value={formatPaise(k.avgOrderValue)} />
        <KpiCard label="Tickets sold" value={k.ticketsSold} sub={`${k.distinctCustomers} customers`} />
      </div>

      <ChartCard title="Revenue" description="Paid ticket revenue, last 30 days">
        <RevenueAreaChart data={a.trend} />
      </ChartCard>

      <Card>
        <CardHeader><CardTitle className="text-base">Discounts by source</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {a.discounts.length === 0 ? (
            <p className="text-muted-foreground">No discounts applied yet.</p>
          ) : (
            a.discounts.map((d) => (
              <div key={d.source} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{d.source.toLowerCase().replace(/_/g, " ")}</span>
                <span className="font-medium">{d.count} orders · {formatPaise(d.total)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
