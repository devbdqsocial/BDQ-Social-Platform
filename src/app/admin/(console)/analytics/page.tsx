import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getAnalytics } from "@/server/analytics/service";
import { listAllForAdmin } from "@/server/events/service";
import { formatPaise } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { RevenueAreaChart, StallOccupancyDonut } from "@/components/charts/dashboard-charts";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PctBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round(value * 100))}%` }} />
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  await requirePermission("PAYMENT_VIEW");
  const { eventId } = await searchParams;
  const [a, events] = await Promise.all([getAnalytics(eventId || undefined), listAllForAdmin()]);

  const peak = a.trend.reduce((m, t) => (t.revenue > m.revenue ? t : m), a.trend[0]);

  return (
    <div className="max-w-5xl space-y-8">
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

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total revenue" value={formatPaise(a.kpis.totalRevenue)} sub={`Tickets ${formatPaise(a.kpis.grossTicketRevenue)} · Stalls ${formatPaise(a.kpis.stallRevenue)}`} />
        <Stat label="Tickets sold" value={String(a.kpis.ticketsSold)} sub={`${a.kpis.paidOrders} paid orders`} />
        <Stat label="Avg order value" value={formatPaise(a.kpis.avgOrderValue)} sub={`Discounts ${formatPaise(a.kpis.totalDiscount)}`} />
        <Stat label="Customers" value={String(a.kpis.distinctCustomers)} sub={`${a.customers.returning} returning · ${a.customers.new} new`} />
        <Stat label="Attendance" value={pct(a.kpis.attendanceRate)} sub={`${a.kpis.checkedIn} of ${a.kpis.ticketsSold} checked in`} />
        <Stat
          label="Capacity used"
          value={a.kpis.capacityUtil != null ? pct(a.kpis.capacityUtil) : "—"}
          sub={a.kpis.capacity != null ? `of ${a.kpis.capacity}` : "pick an event"}
        />
        <Stat label="Conversion" value={pct(a.funnel.conversion)} sub={`${a.funnel.abandoned} abandoned`} />
        <Stat label="Approved vendors" value={String(a.kpis.approvedVendors)} sub={`Stalls ${pct(a.stalls.pct)} booked`} />
      </div>

      {/* Sales trend */}
      <ChartCard title="Revenue · last 30 days" description={`Peak ${formatPaise(peak.revenue)} on ${peak.day}`}>
        <RevenueAreaChart data={a.trend} />
      </ChartCard>

      {/* Funnel + ticket types */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="font-display text-lg font-semibold">Order funnel</h2>
            {(["PAID", "PENDING", "EXPIRED", "FAILED"] as const).map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s}</span>
                <span className="font-medium">{a.funnel.counts[s]}</span>
              </div>
            ))}
            <p className="border-t border-border pt-2 text-xs text-muted-foreground">{a.funnel.created} orders created · {pct(a.funnel.conversion)} paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="font-display text-lg font-semibold">Ticket types</h2>
            {a.ticketTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ticket types.</p>
            ) : (
              a.ticketTypes.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">{t.sold}/{t.total} · {formatPaise(t.revenue)}</span>
                  </div>
                  <PctBar value={t.pct} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discounts + occupancy */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="font-display text-lg font-semibold">Discounts</h2>
            {a.discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No discounts applied yet.</p>
            ) : (
              a.discounts.map((d) => (
                <div key={d.source} className="flex items-center justify-between text-sm">
                  <Badge variant="warning">{d.source.toLowerCase().replace(/_/g, " ")}</Badge>
                  <span className="text-muted-foreground">{d.count} orders · {formatPaise(d.total)}</span>
                </div>
              ))
            )}
            {a.topCoupons.length > 0 && (
              <div className="border-t border-border pt-2">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Top coupons</p>
                {a.topCoupons.map((c) => (
                  <div key={c.code} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{c.code}</span>
                    <span className="text-muted-foreground">
                      {c.type === "PERCENT" ? `${c.value}%` : formatPaise(c.value)} · used {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="font-display text-lg font-semibold">Stall occupancy</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Booked</span>
              <span className="font-medium">{a.stalls.booked}/{a.stalls.total} ({pct(a.stalls.pct)})</span>
            </div>
            <StallOccupancyDonut counts={a.stalls.counts} />
            {a.utm.length > 0 && (
              <div className="border-t border-border pt-2">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Top sources</p>
                {a.utm.slice(0, 5).map((u) => (
                  <div key={u.key} className="flex items-center justify-between text-sm">
                    <span>{u.key}</span>
                    <span className="text-muted-foreground">{u.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <section>
        <h2 className="font-display text-lg font-semibold">Recent paid orders</h2>
        {a.recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No paid orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {a.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="truncate text-muted-foreground">{o.event.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{formatPaise(o.total)}</span>
                  <span className="text-xs text-muted-foreground">{fmtTime(o.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
