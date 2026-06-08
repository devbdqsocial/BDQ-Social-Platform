import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getFunnelCohort } from "@/server/analytics/deep";
import { getActiveEvent } from "@/server/admin/event-context";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { StatBar } from "@/components/charts/mini";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Funnel & Cohort" };
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

export default async function FunnelPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const { funnel, cohort } = await getFunnelCohort(active?.id);
  const steps = [
    { label: "Orders created", value: funnel.created },
    { label: "Paid", value: funnel.counts.PAID },
  ];
  const maxStep = Math.max(1, ...steps.map((s) => s.value));

  return (
    <div className="space-y-8">
      <PageHeader title="Funnel & Cohort" description={active ? `Conversion and repeat behaviour for ${active.name}.` : "Conversion and repeat behaviour."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Conversion" value={pct(funnel.conversion)} sub={`${funnel.counts.PAID}/${funnel.created} orders`} />
        <KpiCard label="Abandoned" value={funnel.abandoned} sub="Pending + expired" />
        <KpiCard label="Repeat buyers" value={cohort.repeatBuyers} sub={`of ${cohort.distinct} customers`} />
        <KpiCard label="Multi-event" value={cohort.multiEvent} sub="Bought across >1 event" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Order funnel" description="Created → paid.">
          <div className="space-y-4">
            {steps.map((s) => <StatBar key={s.label} label={s.label} value={s.value} max={maxStep} money={false} tone="bg-secondary" />)}
          </div>
        </ChartCard>
        <ChartCard title="Customer mix" description="New vs returning.">
          <div className="space-y-4">
            <StatBar label="New" value={cohort.newBuyers} max={Math.max(1, cohort.distinct)} money={false} tone="bg-primary" />
            <StatBar label="Returning" value={cohort.repeatBuyers} max={Math.max(1, cohort.distinct)} money={false} tone="bg-accent" />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
