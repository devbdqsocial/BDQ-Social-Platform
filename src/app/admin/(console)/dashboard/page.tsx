import Link from "next/link";
import { fmtCompact as fmtDate } from "@/lib/date-formats";
import { Clock, Ticket as TicketIcon, XCircle, CheckCircle2, FileText, ShoppingBag, Store, UserCheck, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { getCommandCenter } from "@/server/analytics/dashboard";
import { getArtistFinanceStats } from "@/server/artists/finance";
import { formatPaise } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { RevenueAreaChart } from "@/components/charts/dashboard-charts";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const ACTIVITY_ICON = { order: ShoppingBag, booking: Store, checkin: UserCheck } as const;

export default async function AdminDashboard() {
  await requireAdmin();
  const { active } = await getActiveEvent();
  const cc = await getCommandCenter(active?.id);
  const t = cc.tiles;
  const artistStats = active ? await getArtistFinanceStats(active.id) : null;

  const now = Date.now();
  const eventDay = !!active && active.startsAt.getTime() <= now && now <= active.endsAt.getTime();

  const tierSub = t.sponsors.byTier.length
    ? t.sponsors.byTier.map((x) => `${x.count} ${x.tier.toLowerCase()}`).join(" · ")
    : "none yet";

  // Retained "needs attention" feed (actionable items not in the alert row / tiles).
  const tasks = [
    { n: cc.pending.expiringHolds, label: "stall hold(s) expiring within the hour", href: "/admin/venue/stalls", icon: Clock },
    { n: cc.pending.soldOutTypes, label: "ticket type(s) sold out", href: "/admin/analytics", icon: TicketIcon },
    { n: cc.unsignedContracts, label: "vendor contract(s) awaiting signature", href: "/admin/vendors", icon: FileText },
    { n: cc.pending.failedPayments, label: "failed payment(s), last 30 days", href: "/admin/analytics", icon: XCircle },
  ].filter((x) => x.n > 0);

  return (
    <div className="space-y-6">
      {eventDay && <AutoRefresh seconds={60} />}
      <PageHeader
        title="Command center"
        description={active ? `Live numbers for ${active.name}.` : "Create an event to see live numbers."}
      />

      {/* Six founder tiles (admin-portal §2) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Revenue" value={formatPaise(t.revenue.grossPaise)} sub={`${formatPaise(t.revenue.netPaise)} net after fees`} />
        <KpiCard label="Tickets" value={`${t.tickets.sold}/${t.tickets.total}`} trend={t.tickets.spark} sub="sold · 14d" />
        <KpiCard label="Check-ins" value={t.checkins.live} sub={`${pct(t.checkins.pctOfSold)} of sold`} />
        <KpiCard label="Vendors" value={`${t.vendors.booked}/${t.vendors.total}`} sub={`${t.vendors.pendingReview} pending review`} />
        <KpiCard label="Sponsors" value={formatPaise(t.sponsors.signedPaise)} sub={tierSub} />
        <KpiCard label="Waitlist" value={t.waitlist.total} sub={`+${t.waitlist.added7d} this week`} />
        {artistStats && (
          <KpiCard
            label="Artists"
            value={`${artistStats.confirmedActs} confirmed`}
            sub={`${formatPaise(artistStats.talentSpendPaise)} spent · ${formatPaise(artistStats.unpaidPaise)} due`}
          />
        )}
      </div>

      {/* Alert row — danger-tinted, only when something is wrong */}
      {cc.alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cc.alerts.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/15"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span><span className="font-semibold">{a.n}</span> {a.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Revenue chart + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue" description="Paid revenue by day, last 30 days">
            <div className="h-[280px]"><RevenueAreaChart data={cc.revenueByDay} /></div>
          </ChartCard>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {cc.activity.length === 0 ? (
              <p className="text-muted-foreground">No activity yet.</p>
            ) : (
              cc.activity.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <div key={i} className="flex items-center gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{a.label}</span>
                    <span className="shrink-0 text-muted-foreground">{a.sub}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.at)}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Needs attention + system health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Needs attention</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tasks.length === 0 ? (
              <p className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-success" /> Nothing pending.</p>
            ) : (
              tasks.map((task) => (
                <Link key={task.label} href={task.href} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                  <task.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span><span className="font-semibold">{task.n}</span> {task.label}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">System health</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <HealthRow label="Last cron tick" at={cc.health.cronAt} />
            <HealthRow label="Last webhook received" at={cc.health.webhookAt} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HealthRow({ label, at }: { label: string; at: Date | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{at ? fmtDate(at) : "—"}</span>
    </div>
  );
}
