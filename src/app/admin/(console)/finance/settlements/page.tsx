import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { listSettlements, getSettlementSummary } from "@/server/finance/settlements";
import { formatPaise } from "@/lib/utils";
import { KpiCard } from "@/components/charts/kpi-card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { addSettlementAction, toggleSettlementAction } from "./actions";

export const metadata: Metadata = { title: "Settlements" };

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);
const today = () => new Date().toISOString().slice(0, 10);

export default async function SettlementsPage() {
  await requireAdminRole();
  const [summary, settlements] = await Promise.all([getSettlementSummary(), listSettlements()]);

  return (
    <div className="space-y-8">
      <PageHeader title="Settlements" description="Reconcile money Razorpay has deposited against the net of all captured online payments." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Captured (net of fees)" value={formatPaise(summary.capturedNet)} sub={`${formatPaise(summary.capturedGross)} gross − ${formatPaise(summary.fees)} fees`} />
        <KpiCard label="Settled to bank" value={formatPaise(summary.settledTotal)} sub={`${settlements.length} settlements`} />
        <KpiCard label="Unsettled" value={formatPaise(summary.unsettled)} sub="Collected, not yet deposited" />
        <KpiCard label="Gateway fees" value={formatPaise(summary.fees)} sub="Razorpay fee + tax" />
      </div>

      <form action={addSettlementAction} className="space-y-6">
        <h2 className="text-lg font-semibold tracking-tight">Record a settlement</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Settlement ID / UTR">
            <Input name="gatewayRef" required placeholder="setl_… or bank UTR" />
          </Field>
          <Field label="Net amount (₹)">
            <Input type="number" name="amountRupees" min={0} step="0.01" required />
          </Field>
          <Field label="Settled on">
            <Input type="date" name="settledAt" defaultValue={today()} required />
          </Field>
          <Field label="Fee (₹)" hint="Optional.">
            <Input type="number" name="feeRupees" min={0} step="0.01" />
          </Field>
          <Field label="Tax (₹)" hint="Optional.">
            <Input type="number" name="taxRupees" min={0} step="0.01" />
          </Field>
          <Button type="submit" className="w-fit self-end">Add settlement</Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Recorded settlements ({settlements.length})</h2>
        {settlements.length === 0 ? (
          <p className="text-sm text-muted-foreground">None recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {settlements.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="font-mono text-sm">{s.gatewayRef}</span>
                    <Badge variant={s.status === "RECONCILED" ? "success" : "warning"}>{s.status}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPaise(s.amountPaise)} net · {fmtDate(s.settledAt)}
                  </p>
                </div>
                <form action={toggleSettlementAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="status" value={s.status === "RECONCILED" ? "UNMATCHED" : "RECONCILED"} />
                  <Button type="submit" variant="ghost" size="sm">
                    {s.status === "RECONCILED" ? "Mark unmatched" : "Mark reconciled"}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
