import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getCompOrder } from "@/server/comps/service";
import { toQrDataUrl } from "@/lib/qr-token";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Comp tickets" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function CompSheetPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireSuperAdmin();
  const { orderId } = await params;
  const order = await getCompOrder(orderId);
  if (!order) notFound();

  const tickets = await Promise.all(
    order.tickets.map(async (t) => ({ t, qr: await toQrDataUrl(t.qrToken) })),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{tickets.length} comp ticket{tickets.length === 1 ? "" : "s"}</h1>
          <p className="text-sm text-muted-foreground">{order.event.name} · {fmt(order.event.startsAt)}</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link href="/admin/tickets/comps">← Back</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tickets.map(({ t, qr }) => (
          <div key={t.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Ticket QR" className="size-28 shrink-0 rounded-lg bg-white p-1.5" />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{t.ticketType.name}</p>
              <p className="text-muted-foreground">{t.holderName ?? "Guest"}</p>
              {t.holderEmail && <p className="truncate text-xs text-muted-foreground">{t.holderEmail}</p>}
              <p className="mt-1 text-xs text-muted-foreground">#{t.id.slice(0, 8)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
