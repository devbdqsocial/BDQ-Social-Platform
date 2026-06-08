import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getVendorScorecard } from "@/server/analytics/deep";
import { getActiveEvent } from "@/server/admin/event-context";
import { formatPaise } from "@/lib/utils";
import { ChartCard } from "@/components/charts/chart-card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Vendor Scorecard" };

export default async function VendorScorecardPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const rows = await getVendorScorecard(active?.id);

  return (
    <div className="space-y-8">
      <PageHeader title="Vendor Scorecard" description={active ? `Stalls, payment speed and revenue per vendor for ${active.name}.` : "Stalls, payment speed and revenue per vendor."} />
      <ChartCard title={`Vendors (${rows.length})`} description="Sorted by stall-fee revenue.">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Vendor</th>
                  <th className="py-2 font-medium">Stalls</th>
                  <th className="py-2 font-medium">Paid</th>
                  <th className="py-2 font-medium">Avg days to pay</th>
                  <th className="py-2 font-medium">Repeat events</th>
                  <th className="py-2 font-medium">Contract</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.vendor} className="border-b border-border/60">
                    <td className="py-2">{v.vendor}</td>
                    <td className="py-2">{v.stalls}</td>
                    <td className="py-2">{v.paid}</td>
                    <td className="py-2">{v.avgDaysToPay ?? "—"}</td>
                    <td className="py-2">{v.repeatEvents}</td>
                    <td className="py-2">
                      <Badge variant={v.contract === "SIGNED" ? "success" : "neutral"}>{v.contract}</Badge>
                    </td>
                    <td className="py-2 text-right font-medium">{formatPaise(v.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
