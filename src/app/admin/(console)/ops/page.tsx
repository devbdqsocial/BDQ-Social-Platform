import type { Metadata } from "next";
import { fmtDateTime as fmt } from "@/lib/date-formats";
import { requireAdminRole } from "@/server/auth/guard";
import { db } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "System" };
export const dynamic = "force-dynamic";

function Stat({ label, value, bad }: { label: string; value: string | number; bad?: boolean }) {
  return (
    <div className="border-l-2 border-border/60 pl-4 py-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${bad ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

export default async function OpsPage() {
  await requireAdminRole();
  const now = new Date();
  const fifteenAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const [outboxGroups, outboxFails, orderGroups, stuckPending, expiredHolds, activeLimits, lastAudit] = await Promise.all([
    db.outbox.groupBy({ by: ["status"], _count: { _all: true } }),
    db.outbox.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, channel: true, toAddress: true, lastError: true, attempts: true } }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.count({ where: { status: "PENDING", createdAt: { lt: fifteenAgo } } }),
    db.stall.count({ where: { status: "HELD", holdUntil: { lt: now } } }),
    db.rateLimit.count({ where: { resetAt: { gt: now } } }),
    db.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, action: true } }),
  ]);

  const ob = Object.fromEntries(outboxGroups.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const ord = Object.fromEntries(orderGroups.map((g) => [g.status, g._count._all])) as Record<string, number>;

  return (
    <div className="space-y-8">
      <PageHeader title="System health" description="Live operational signals. Read-only." />

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Notifications (outbox)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Queued" value={ob.QUEUED ?? 0} />
          <Stat label="Sent" value={ob.SENT ?? 0} />
          <Stat label="Failed" value={ob.FAILED ?? 0} bad={(ob.FAILED ?? 0) > 0} />
        </div>
        {outboxFails.length > 0 && (
          <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
            {outboxFails.map((f) => (
              <li key={f.id} className="py-3">
                <p className="font-medium">{f.channel} → {f.toAddress} <span className="text-xs text-muted-foreground">({f.attempts} attempts)</span></p>
                <p className="truncate text-xs text-destructive">{f.lastError ?? "unknown error"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Orders &amp; bookings</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Paid" value={ord.PAID ?? 0} />
          <Stat label="Pending" value={ord.PENDING ?? 0} />
          <Stat label="Stuck pending (>15m)" value={stuckPending} bad={stuckPending > 0} />
          <Stat label="Expired holds" value={expiredHolds} bad={expiredHolds > 0} />
        </div>
        {(stuckPending > 0 || expiredHolds > 0) && (
          <p className="mt-2 text-xs text-muted-foreground">
            Stuck pending orders are swept by the reconcile cron; expired holds by release-holds. Non-zero for long = check the crons.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Database" value="ok" />
        <Stat label="Active rate-limit windows" value={activeLimits} />
        <div className="border-l-2 border-border/60 pl-4 py-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Last admin action</p>
          <p className="mt-1 text-sm font-medium">{lastAudit ? lastAudit.action : "—"}</p>
          {lastAudit && <p className="text-xs text-muted-foreground">{fmt(lastAudit.createdAt)}</p>}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Machine-readable: <Badge variant="neutral">GET /api/health</Badge>
      </p>
    </div>
  );
}
