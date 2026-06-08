import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getAttendance } from "@/server/analytics/deep";
import { getActiveEvent } from "@/server/admin/event-context";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { StatBar } from "@/components/charts/mini";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Attendance" };
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

export default async function AttendancePage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const a = await getAttendance(active?.id);
  const maxGate = Math.max(1, ...a.gates.map((g) => g.count));

  return (
    <div className="space-y-8">
      <PageHeader title="Attendance" description={active ? `Turnout and no-shows for ${active.name}.` : "Turnout and no-shows."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tickets sold" value={a.sold.toLocaleString("en-IN")} sub="Excl. comps" />
        <KpiCard label="Checked in" value={a.checkedIn.toLocaleString("en-IN")} sub={pct(a.attendanceRate)} />
        <KpiCard label="No-shows" value={a.noShow.toLocaleString("en-IN")} sub={pct(a.noShowRate)} />
        <KpiCard label="Gates" value={a.gates.length} sub="Active entry points" />
      </div>
      <ChartCard title="Gate load" description="Check-ins per gate.">
        {a.gates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins yet.</p>
        ) : (
          <div className="space-y-3">
            {a.gates.map((g) => <StatBar key={g.gate} label={g.gate} value={g.count} max={maxGate} money={false} tone="bg-secondary" />)}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
