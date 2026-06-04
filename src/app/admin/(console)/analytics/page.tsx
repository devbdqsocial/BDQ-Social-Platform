import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getAnalytics } from "@/server/analytics/service";
import { listAllForAdmin } from "@/server/events/service";
import { formatPaise } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { KpiCard } from "@/components/charts/kpi-card";
import {
  RevenueAreaChart, TicketTypeBar, StallOccupancyDonut,
} from "@/components/charts/dashboard-charts";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  await requirePermission("PAYMENT_VIEW");
  const { eventId } = await searchParams;
  const [a, events] = await Promise.all([getAnalytics(eventId || undefined), listAllForAdmin()]);

  const peak = a.trend.reduce((m, t) => (t.revenue > m.revenue ? t : m), a.trend[0] || { revenue: 0, day: "—" });
  const trendSpark = a.trend.map((b) => b.revenue);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Sales, revenue, attendance, and occupancy at a glance."
        actions={
          <div className="flex items-end gap-2">
            <form method="get" action="/admin/analytics" className="flex items-end gap-2">
              <Select name="eventId" defaultValue={eventId ?? ""} className="w-48">
                <option value="">All events</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
              <Button type="submit" size="sm">View</Button>
            </form>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/admin/export/orders${eventId ? `?eventId=${eventId}` : ""}`}>Export CSV</a>
            </Button>
          </div>
        }
      />

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={formatPaise(a.kpis.totalRevenue)}
          sub={`Tickets ${formatPaise(a.kpis.grossTicketRevenue)} · Stalls ${formatPaise(a.kpis.stallRevenue)}`}
          trend={trendSpark}
        />
        <KpiCard
          label="Tickets sold"
          value={String(a.kpis.ticketsSold)}
          sub={`${a.kpis.paidOrders} paid orders`}
        />
        <KpiCard
          label="Avg order value"
          value={formatPaise(a.kpis.avgOrderValue)}
          sub={`Discounts ${formatPaise(a.kpis.totalDiscount)}`}
        />
        <KpiCard
          label="Customers"
          value={String(a.kpis.distinctCustomers)}
          sub={`${a.customers.returning} returning · ${a.customers.new} new`}
        />
        <KpiCard
          label="Attendance"
          value={pct(a.kpis.attendanceRate)}
          sub={`${a.kpis.checkedIn} of ${a.kpis.ticketsSold} checked in`}
        />
        <KpiCard
          label="Capacity used"
          value={a.kpis.capacityUtil != null ? pct(a.kpis.capacityUtil) : "—"}
          sub={a.kpis.capacity != null ? `of ${a.kpis.capacity}` : "pick an event"}
        />
        <KpiCard
          label="Conversion"
          value={pct(a.funnel.conversion)}
          sub={`${a.funnel.abandoned} abandoned`}
        />
        <KpiCard
          label="Approved vendors"
          value={String(a.kpis.approvedVendors)}
          sub={`Stalls ${pct(a.stalls.pct)} booked`}
        />
      </div>

      {/* Platform & Operational Metrics */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">Platform Operations & Health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Online Revenue"
            value={formatPaise(a.extras.onlineRevenue)}
            sub="Razorpay payments captured"
          />
          <KpiCard
            label="Offline Revenue"
            value={formatPaise(a.extras.offlineRevenue)}
            sub="Cash/Direct payments"
          />
          <KpiCard
            label="Comp Tickets"
            value={String(a.extras.compsCount)}
            sub="Free / Complimentary tickets"
          />
          <KpiCard
            label="Waitlist Signups"
            value={String(a.extras.ticketWaitlist + a.extras.stallWaitlist)}
            sub={`Tickets: ${a.extras.ticketWaitlist} · Stalls: ${a.extras.stallWaitlist}`}
          />
          <KpiCard
            label="Outbox Delivery Success"
            value={`${Math.round(a.extras.deliveryRate * 100)}%`}
            sub="Notification success rate"
          />
          <KpiCard
            label="Vendor Contracts Signed"
            value={`${a.extras.signedContracts}/${a.extras.totalContracts}`}
            sub={a.extras.totalContracts ? `${Math.round((a.extras.signedContracts / a.extras.totalContracts) * 100)}% signed` : "No contracts generated"}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue · last 30 days" description={`Peak ${formatPaise(peak.revenue)} on ${peak.day}`}>
          <RevenueAreaChart data={a.trend} />
        </ChartCard>
        <ChartCard title="Ticket sales" description="Sold vs capacity by type">
          <TicketTypeBar data={a.ticketTypes.map((t) => ({ name: t.name, sold: t.sold, total: t.total }))} />
        </ChartCard>
        <ChartCard title="Stall occupancy" description="Live stall status">
          <StallOccupancyDonut counts={a.stalls.counts} />
        </ChartCard>
        <ChartCard title="Check-in Gates Footfall" description="Scanned check-ins per gate">
          {a.extras.gates.length === 0 ? (
            <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">No check-ins yet.</div>
          ) : (
            <div className="space-y-4 py-2">
              {a.extras.gates.map((g) => (
                <div key={g.gate} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.gate}</span>
                    <span className="text-muted-foreground">{g.count} scans</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, Math.round((g.count / (a.kpis.checkedIn || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Feeds / Details */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 pt-4">
        {/* Order funnel */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Order funnel</h3>
          <div className="space-y-2 text-sm">
            {(["PAID", "PENDING", "EXPIRED", "FAILED"] as const).map((s) => (
              <div key={s} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{s}</span>
                <span className="font-semibold">{a.funnel.counts[s]}</span>
              </div>
            ))}
            <div className="pt-2 text-xs text-muted-foreground">
              {a.funnel.created} orders created · {pct(a.funnel.conversion)} paid
            </div>
          </div>
        </div>

        {/* Discounts */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Discounts & Coupons</h3>
          <div className="space-y-2 text-sm">
            {a.discounts.length === 0 ? (
              <p className="text-muted-foreground text-xs">No discounts applied yet.</p>
            ) : (
              a.discounts.map((d) => (
                <div key={d.source} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <Badge variant="warning">{d.source.toLowerCase().replace(/_/g, " ")}</Badge>
                  <span className="text-muted-foreground">{d.count} orders · {formatPaise(d.total)}</span>
                </div>
              ))
            )}
            {a.topCoupons.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Top coupons</p>
                <div className="space-y-1">
                  {a.topCoupons.map((c) => (
                    <div key={c.code} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-primary">{c.code}</span>
                      <span className="text-muted-foreground">
                        {c.type === "PERCENT" ? `${c.value}%` : formatPaise(c.value)} · used {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* UTM Sources */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Marketing Sources</h3>
          <div className="space-y-2 text-sm">
            {a.utm.length === 0 ? (
              <p className="text-muted-foreground text-xs">No UTM tracking data.</p>
            ) : (
              a.utm.slice(0, 6).map((u) => (
                <div key={u.key} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <span className="truncate">{u.key || "Direct / Unknown"}</span>
                  <span className="font-semibold text-muted-foreground">{u.count} orders</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent paid orders */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Paid Orders</h3>
          <div className="space-y-2 text-sm">
            {a.recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-xs">No paid orders yet.</p>
            ) : (
              a.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <span className="truncate text-muted-foreground">{o.event.name}</span>
                  <span className="font-medium shrink-0">{formatPaise(o.total)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{fmtTime(o.createdAt).split(",")[0]}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

