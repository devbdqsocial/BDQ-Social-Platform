import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getProductMargin } from "@/server/analytics/deep";
import { getActiveEvent } from "@/server/admin/event-context";
import { ChartCard } from "@/components/charts/chart-card";
import { StatBar } from "@/components/charts/mini";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Products" };
const pct = (r: number) => `${(r * 100).toFixed(0)}%`;

export default async function ProductsPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const { ticketTypes, stalls } = await getProductMargin(active?.id);
  const maxTt = Math.max(1, ...ticketTypes.map((t) => t.revenue));
  const maxStall = Math.max(1, ...stalls.map((s) => s.revenue));

  return (
    <div className="space-y-8">
      <PageHeader title="Products" description={active ? `Revenue and occupancy by ticket type and stall type for ${active.name}.` : "Revenue and occupancy by ticket and stall type."} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Ticket types" description="Revenue, with sell-through.">
          {ticketTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ticket types.</p>
          ) : (
            <div className="space-y-3">
              {ticketTypes.map((t) => (
                <StatBar key={t.name} label={`${t.name} · ${t.sold}/${t.total} (${pct(t.pct)})`} value={t.revenue} max={maxTt} tone="bg-secondary" />
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title="Stall types" description="Booked revenue by type.">
          {stalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stall bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {stalls.map((s) => <StatBar key={s.name} label={`${s.name} (${s.count})`} value={s.revenue} max={maxStall} tone="bg-primary" />)}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
