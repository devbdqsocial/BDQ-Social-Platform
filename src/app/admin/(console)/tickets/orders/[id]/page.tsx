import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/guard";
import { getOrderForAdmin } from "@/server/tickets/admin-service";
import { formatPaise } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Order" };

const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
const STATUS: Record<string, "success" | "warning" | "danger" | "neutral"> = { PAID: "success", PENDING: "warning", FAILED: "danger", EXPIRED: "neutral" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("PAYMENT_VIEW");
  const { id } = await params;
  const o = await getOrderForAdmin(id);
  if (!o) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold">Order <span className="font-mono text-lg">{o.id.slice(0, 10)}</span></h1>
          <Badge variant={STATUS[o.status] ?? "neutral"}>{o.status}</Badge>
        </div>
        <Link href="/admin/tickets/orders" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All orders</Link>
      </div>

      <Card>
        <CardContent className="grid gap-2 pt-6 text-sm">
          <Row label="Customer" value={o.user.name ?? o.user.phone ?? o.user.email ?? "—"} />
          <Row label="Contact" value={o.user.phone ?? o.user.email ?? "—"} />
          <Row label="Event" value={o.event.name} />
          <Row label="Placed" value={fmt(o.createdAt)} />
          {o.coupon && <Row label="Coupon" value={o.coupon.code} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Amount</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label="Subtotal" value={formatPaise(o.subtotal)} />
          <Row label="Discount" value={o.discount > 0 ? `− ${formatPaise(o.discount)} (${o.discountSource})` : "—"} />
          <Row label="Total" value={formatPaise(o.total)} strong />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payments ({o.payments.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {o.payments.length === 0 ? (
            <p className="text-muted-foreground">No payment recorded.</p>
          ) : (
            o.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                <span>{p.gateway} · {p.mode}</span>
                <span className="font-medium">{formatPaise(p.amount)}</span>
                <Badge variant={p.status === "CAPTURED" ? "success" : p.status === "FAILED" ? "danger" : "neutral"}>{p.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tickets issued ({o.tickets.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {o.tickets.length === 0 ? (
            <p className="text-muted-foreground">No tickets issued yet.</p>
          ) : (
            o.tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                <span>{t.ticketType.name}{t.holderName ? ` · ${t.holderName}` : ""}</span>
                <Badge variant={t.status === "CHECKED_IN" ? "success" : t.status === "CANCELLED" ? "danger" : "neutral"}>{t.status.replace(/_/g, " ")}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
