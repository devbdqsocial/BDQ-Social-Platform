import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getCustomerRfm } from "@/server/analytics/deep";
import { formatPaise } from "@/lib/utils";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { StatBar } from "@/components/charts/mini";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Customers (LTV / RFM)" };

export default async function CustomersPage() {
  await requirePermission("PAYMENT_VIEW");
  const r = await getCustomerRfm();
  const maxSeg = Math.max(1, ...r.bySegment.map((s) => s.count));

  return (
    <div className="space-y-8">
      <PageHeader title="Customers (LTV / RFM)" description="Lifetime value and recency/frequency/monetary segments across all events." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Customers" value={r.customers.toLocaleString("en-IN")} sub="With a paid order" />
        <KpiCard label="Avg LTV" value={formatPaise(r.avgLtv)} sub="Lifetime spend / customer" />
        <KpiCard label="Segments" value={r.bySegment.length} sub="RFM groups" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="By segment" description="Customer count per RFM segment.">
          <div className="space-y-3">
            {r.bySegment.map((s) => <StatBar key={s.segment} label={`${s.segment} · ${formatPaise(s.revenue)}`} value={s.count} max={maxSeg} money={false} tone="bg-secondary" />)}
          </div>
        </ChartCard>
        <ChartCard title="Top customers" description="Highest lifetime spend.">
          {r.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {r.top.map((c) => (
                <li key={c.userId} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-mono text-xs">{c.userId.slice(0, 10)} <span className="text-muted-foreground">· {c.frequency}× · {c.recencyDays}d ago</span></span>
                  <span className="font-medium">{formatPaise(c.monetary)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
