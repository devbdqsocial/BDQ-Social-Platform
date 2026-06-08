import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getPaymentFailures } from "@/server/analytics/deep";
import { getActiveEvent } from "@/server/admin/event-context";
import { formatPaise } from "@/lib/utils";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Payment Failures" };
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function FailuresPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const f = await getPaymentFailures(active?.id);

  return (
    <div className="space-y-8">
      <PageHeader title="Payment Failures" description={active ? `Failed, expired and abandoned orders for ${active.name}.` : "Failed, expired and abandoned orders."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Failed" value={f.counts.FAILED} sub="Gateway declines" />
        <KpiCard label="Expired" value={f.counts.EXPIRED} sub="Timed out unpaid" />
        <KpiCard label="Fail rate" value={pct(f.failRate)} sub={`of ${f.created} created`} />
        <KpiCard label="Abandoned value" value={formatPaise(f.abandonedValue)} sub={`${f.abandonedCount} orders`} />
      </div>
      <ChartCard title="Recent failed / expired orders" description="Latest 10.">
        {f.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failures — nice.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {f.recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-mono">{o.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground"> · {o.user?.name ?? o.user?.phone ?? "—"}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={o.status === "FAILED" ? "danger" : "warning"}>{o.status}</Badge>
                  <span className="font-medium">{formatPaise(o.total)}</span>
                  <span className="text-xs text-muted-foreground">{fmt(o.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}
