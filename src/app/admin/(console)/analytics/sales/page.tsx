import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getSalesHeatmapForecast } from "@/server/analytics/deep";
import { getActiveEvent } from "@/server/admin/event-context";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Heatmap } from "@/components/charts/mini";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Sales Timing" };

export default async function SalesTimingPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const { heatmap, pacing } = await getSalesHeatmapForecast(active?.id);

  return (
    <div className="space-y-8">
      <PageHeader title="Sales Timing" description={active ? `When orders land + sell-out pacing for ${active.name}.` : "When orders land + sell-out pacing."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tickets sold" value={pacing.sold.toLocaleString("en-IN")} sub={pacing.capacity != null ? `of ${pacing.capacity.toLocaleString("en-IN")}` : "no capacity set"} />
        <KpiCard label="Remaining" value={pacing.remaining != null ? pacing.remaining.toLocaleString("en-IN") : "—"} sub="To capacity" />
        <KpiCard label="Sales rate" value={`${pacing.ratePerDay}/day`} sub="Last 14 days" />
        <KpiCard label="Sell-out ETA" value={pacing.daysToSellout != null ? `${pacing.daysToSellout}d` : "—"} sub="At current rate" />
      </div>
      <ChartCard title="Order heatmap" description="Order volume by hour of day and day of week (IST). Darker = busier.">
        <Heatmap cells={heatmap} />
      </ChartCard>
    </div>
  );
}
