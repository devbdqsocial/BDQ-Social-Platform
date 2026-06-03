import Link from "next/link";
import { Clock, Ticket as TicketIcon, UserCheck, XCircle, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { getDashboard } from "@/server/analytics/dashboard";
import { formatPaise } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { DashboardFilter } from "@/components/admin/dashboard-filter";
import {
  RevenueAreaChart, TicketTypeBar, VendorPipelineBar, StallOccupancyDonut,
} from "@/components/charts/dashboard-charts";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);

const RANGE_DAYS: Record<string, number | null> = { today: 1, "7d": 7, "30d": 30, all: null };
const RANGE_LABEL: Record<string, string> = { today: "today", "7d": "last 7 days", "30d": "last 30 days", all: "all time" };

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  const { range } = await searchParams;
  const rangeKey = range && range in RANGE_DAYS ? range : "30d";
  const { active } = await getActiveEvent();
  const d = await getDashboard(active?.id, RANGE_DAYS[rangeKey]);
  const k = d.kpis;
  const win = RANGE_LABEL[rangeKey];
  const occ = d.stalls;
  const vp = d.vendorPipeline;
  const trendSpark = d.trend.map((b) => b.revenue);

  const pipeline = [
    { stage: "Submitted", count: vp.SUBMITTED },
    { stage: "Under review", count: vp.UNDER_REVIEW },
    { stage: "Approved", count: vp.APPROVED },
    { stage: "Rejected", count: vp.REJECTED },
  ];

  const tasks = [
    { n: d.pending.approvals, label: "vendor application(s) awaiting review", href: "/admin/vendors", icon: UserCheck },
    { n: d.pending.expiringHolds, label: "stall hold(s) expiring within the hour", href: "/admin/venue/stalls", icon: Clock },
    { n: d.pending.failedPayments, label: "failed payment(s) in the last 30 days", href: "/admin/analytics", icon: XCircle },
    { n: d.pending.soldOutTypes, label: "ticket type(s) sold out", href: "/admin/analytics", icon: TicketIcon },
  ].filter((t) => t.n > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={active ? `Command center for ${active.name}.` : "Create an event to see live numbers."}
        actions={<DashboardFilter current={rangeKey} />}
      />

      {/* KPI strip — windowed to the selected range */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Revenue" value={formatPaise(d.range.revenue)} deltaPct={rangeKey === "30d" ? d.revenueDeltaPct ?? undefined : undefined} trend={trendSpark} sub={`${d.range.orders} orders · ${win}`} />
        <KpiCard label="Tickets sold" value={d.range.tickets} sub={win} />
        <KpiCard label="Footfall" value={d.range.footfall} sub={`checked in · ${win}`} />
        <KpiCard label="Vendor occupancy" value={`${occ.booked}/${occ.total}`} sub={`${Math.round(occ.pct * 100)}% of stalls booked`} />
        <KpiCard label="Pending approvals" value={d.pending.approvals} sub="vendors awaiting review" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue" description="Paid ticket revenue, last 30 days">
          <RevenueAreaChart data={d.trend} />
        </ChartCard>
        <ChartCard title="Ticket sales" description="Sold vs capacity by type">
          <TicketTypeBar data={d.ticketTypes.map((t) => ({ name: t.name, sold: t.sold, total: t.total }))} />
        </ChartCard>
        <ChartCard title="Vendor pipeline" description="Applications by stage">
          <VendorPipelineBar data={pipeline} />
        </ChartCard>
        <ChartCard title="Stall occupancy" description="Live stall status">
          <StallOccupancyDonut counts={occ.counts} />
        </ChartCard>
      </div>

      {/* Feeds */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent orders</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.recentOrders.length === 0 ? (
              <p className="text-muted-foreground">No paid orders yet.</p>
            ) : (
              d.recentOrders.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="min-w-0 truncate text-muted-foreground">{o.event.name}</span>
                  <span className="shrink-0 font-medium">{formatPaise(o.total)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(o.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pending tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tasks.length === 0 ? (
              <p className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-success" /> Nothing pending.</p>
            ) : (
              tasks.map((t) => (
                <Link key={t.label} href={t.href} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                  <t.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span><span className="font-semibold">{t.n}</span> {t.label}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">At a glance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Total revenue" value={formatPaise(k.totalRevenue)} />
            <Row label="Stall revenue" value={formatPaise(k.stallRevenue)} />
            <Row label="Approved vendors" value={String(k.approvedVendors)} />
            <Row label="Avg order value" value={formatPaise(k.avgOrderValue)} />
            <Row label="Checked in" value={`${k.checkedIn} (${Math.round(k.attendanceRate * 100)}%)`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
