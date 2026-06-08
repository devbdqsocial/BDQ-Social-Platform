import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getMarketingRoi } from "@/server/analytics/deep";
import { getActiveEvent } from "@/server/admin/event-context";
import { formatPaise } from "@/lib/utils";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { StatBar } from "@/components/charts/mini";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Marketing ROI" };

export default async function MarketingPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const m = await getMarketingRoi(active?.id);
  const maxSrc = Math.max(1, ...m.bySource.map((s) => s.revenue));

  return (
    <div className="space-y-8">
      <PageHeader title="Marketing ROI" description={active ? `Attribution, CAC and coupon ROI for ${active.name}.` : "Attribution, CAC and coupon ROI."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Marketing spend" value={formatPaise(m.marketingSpend)} sub="Approved/paid" />
        <KpiCard label="Customers" value={m.customers} sub="Distinct paid" />
        <KpiCard label="CAC" value={m.cac != null ? formatPaise(m.cac) : "—"} sub="Spend / customer" />
        <KpiCard label="Channels" value={m.bySource.length} sub="UTM sources" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue by source" description="Paid-order revenue by UTM source.">
          {m.bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attributed orders yet.</p>
          ) : (
            <div className="space-y-3">
              {m.bySource.map((s) => <StatBar key={s.source} label={`${s.source} (${s.orders})`} value={s.revenue} max={maxSrc} tone="bg-secondary" />)}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Coupon ROI" description="Revenue driven vs discount given.">
          {m.coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coupon redemptions yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {m.coupons.map((c) => (
                <li key={c.code} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-mono">{c.code} <span className="text-muted-foreground">×{c.redemptions}</span></span>
                  <span className="text-right">
                    <span className="font-medium">{formatPaise(c.revenue)}</span>
                    <span className="block text-xs text-muted-foreground">−{formatPaise(c.discount)} given</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
