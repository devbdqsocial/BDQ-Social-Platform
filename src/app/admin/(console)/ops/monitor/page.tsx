import type { Metadata } from "next";
import { fmtTime as time } from "@/lib/date-formats";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { getOpsSnapshot } from "@/server/ops/tasks";
import { getOpsMap } from "@/server/map/admin-service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/charts/kpi-card";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { OpsLiveMap } from "@/components/admin/OpsLiveMap";

export const metadata: Metadata = { title: "Live Monitor" };
export const dynamic = "force-dynamic";

export default async function LiveMonitorPage() {
  await requireAdminRole();
  const { active } = await getActiveEvent();
  const [{ live, recentCheckins }, opsMap] = await Promise.all([
    getOpsSnapshot(active?.id),
    active ? getOpsMap(active.id) : null,
  ]);

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={20} />
      <PageHeader title="Live Monitor" description={active ? `${active.name} — refreshes every 20s.` : "Select an event from the switcher."} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Checked in today" value={live.checkedInToday} sub="gate entries (live)" />
        <KpiCard label="Orders today" value={live.ordersToday} sub="paid today" />
        <KpiCard label="Tickets issued" value={live.ticketsSold} sub="all-time for event" />
        <KpiCard label="Stalls booked" value={`${live.stalls.booked}/${live.stalls.total}`} sub={`${Math.round(live.stalls.pct * 100)}% occupancy`} />
      </div>

      {opsMap && (
        <Card>
          <CardHeader><CardTitle className="text-base">Venue map — live stall status</CardTitle></CardHeader>
          <CardContent>
            <OpsLiveMap layout={opsMap.layout} statuses={opsMap.statuses} extras={opsMap.extras} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent check-ins</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentCheckins.length === 0 ? (
            <p className="text-muted-foreground">No scans yet.</p>
          ) : (
            recentCheckins.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="flex items-center gap-2">
                  {c.direction === "IN" ? <ArrowDownLeft className="size-4 text-success" /> : <ArrowUpRight className="size-4 text-muted-foreground" />}
                  {c.ticket.holderName ?? c.ticket.ticketType.name}
                </span>
                <span className="text-xs text-muted-foreground">{c.ticket.ticketType.name}{c.gate ? ` · ${c.gate}` : ""} · {time(c.scannedAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
