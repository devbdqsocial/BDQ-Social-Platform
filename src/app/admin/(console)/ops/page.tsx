import type { Metadata } from "next";
import { fmtDateTime as fmt } from "@/lib/date-formats";
import { requireSuperAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import { getHeartbeat, HEARTBEAT } from "@/server/system/heartbeat";
import { integrationStatuses } from "@/server/settings/integrations";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { TestEmailButton } from "./TestEmailButton";

export const metadata: Metadata = { title: "System Health" };
export const dynamic = "force-dynamic";

type Health = "ok" | "warn" | "fail" | "unknown";

/** ok/warn/fail/unknown → coloured Badge. */
function StatusBadge({ status, label }: { status: Health; label?: string }) {
  const map = {
    ok: { variant: "success" as const, text: label ?? "OK" },
    warn: { variant: "warning" as const, text: label ?? "Warning" },
    fail: { variant: "danger" as const, text: label ?? "Down" },
    unknown: { variant: "neutral" as const, text: label ?? "Unknown" },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.text}</Badge>;
}

function ServiceRow({ name, detail, status, label, note }: { name: string; detail?: string; status: Health; label?: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
        <StatusBadge status={status} label={label} />
      </div>
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: string | number; bad?: boolean }) {
  return (
    <div className="border-l-2 border-border/60 pl-4 py-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${bad ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function ago(d: Date | null): string {
  if (!d) return "never";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function OpsPage() {
  const session = await requireSuperAdmin();
  const now = new Date();
  const fifteenAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Real DB liveness probe (with round-trip latency), mirroring /api/health.
  const t0 = Date.now();
  let dbOk = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const dbMs = Date.now() - t0;

  // Demo-seeded outbox rows (dedupeKey demo:*) are terminal fixtures — never count them as real failures.
  const NOT_DEMO = { NOT: { dedupeKey: { startsWith: "demo:" } } };

  const [integrations, outboxGroups, outboxFails, orderGroups, stuckPending, expiredHolds, activeLimits, lastAudit, cronAt, webhookAt, captured24h, self] = await Promise.all([
    integrationStatuses(),
    db.outbox.groupBy({ by: ["status"], _count: { _all: true }, where: NOT_DEMO }),
    db.outbox.findMany({ where: { status: "FAILED", ...NOT_DEMO }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, channel: true, toAddress: true, lastError: true, attempts: true } }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.count({ where: { status: "PENDING", createdAt: { lt: fifteenAgo } } }),
    db.stall.count({ where: { status: "HELD", holdUntil: { lt: now } } }),
    db.rateLimit.count({ where: { resetAt: { gt: now } } }),
    db.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, action: true } }),
    getHeartbeat(HEARTBEAT.cron),
    getHeartbeat(HEARTBEAT.webhook),
    db.payment.count({ where: { status: "CAPTURED", createdAt: { gte: dayAgo } } }),
    db.user.findUnique({ where: { id: session.userId }, select: { email: true } }),
  ]);

  const ob = Object.fromEntries(outboxGroups.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const ord = Object.fromEntries(orderGroups.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const cronStale = !cronAt || now.getTime() - cronAt.getTime() > 25 * 60 * 60 * 1000;
  const failed = ob.FAILED ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader title="System Health" description="Live operational signals for the whole platform. Super-admin only." />

      {/* Services — real DB probe + integration configuration */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Services</h2>
          <TestEmailButton defaultTo={self?.email ?? undefined} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ServiceRow name="Database (Neon)" detail="Live SELECT 1 probe" status={dbOk ? "ok" : "fail"} label={dbOk ? "Healthy" : "Unreachable"} note={`${dbMs} ms`} />
          {integrations
            .filter((i) => i.name !== "Database (Neon)")
            .map((i) => (
              <ServiceRow key={i.name} name={i.name} detail={i.detail} status={i.configured ? "ok" : "unknown"} label={i.configured ? "Connected" : "Not configured"} />
            ))}
        </div>
        <p className="text-xs text-muted-foreground">Integration status reflects configured keys (SendGrid resolves DB-first). Use “Send test email” for a real delivery check.</p>
      </section>

      {/* Heartbeats */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Heartbeats</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <ServiceRow name="Cron scheduler" detail="Vercel daily tick (/api/cron/tick)" status={cronStale ? "warn" : "ok"} label={cronStale ? "Stale (>25h)" : "Healthy"} note={ago(cronAt)} />
          <ServiceRow name="Razorpay webhook" detail="Last received (event-driven)" status="unknown" label={webhookAt ? "Received" : "None yet"} note={ago(webhookAt)} />
        </div>
      </section>

      {/* Notifications outbox (demo rows excluded) */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Notifications (outbox)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Queued" value={ob.QUEUED ?? 0} bad={(ob.QUEUED ?? 0) > 50} />
          <Stat label="Sent" value={ob.SENT ?? 0} />
          <Stat label="Failed" value={failed} bad={failed > 0} />
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
      </section>

      {/* Orders & bookings */}
      <section>
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
      </section>

      {/* Misc signals */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Payments captured (24h)" value={captured24h} />
        <Stat label="Active rate-limit windows" value={activeLimits} />
        <div className="border-l-2 border-border/60 pl-4 py-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Last admin action</p>
          <p className="mt-1 text-sm font-medium">{lastAudit ? lastAudit.action : "—"}</p>
          {lastAudit && <p className="text-xs text-muted-foreground">{fmt(lastAudit.createdAt)}</p>}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Machine-readable: <Badge variant="neutral">GET /api/health</Badge>
      </p>
    </div>
  );
}
