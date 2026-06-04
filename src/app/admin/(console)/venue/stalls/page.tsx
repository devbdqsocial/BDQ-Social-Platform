import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listStallsForEvent } from "@/server/map/admin-service";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StallsTable } from "./StallsTable";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stall inventory" };

export default async function StallInventoryPage() {
  await requireSuperAdmin();
  const { active } = await getActiveEvent();
  const stalls = active ? await listStallsForEvent(active.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Stall inventory" description="Every stall in the active event, layout structure, and assignments." />
        <Button asChild size="sm" variant="outline"><Link href="/admin/venue/map">Open map builder</Link></Button>
      </div>

      {active ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-foreground">Active Event: {active.name}</span>
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                active.status === "LIVE" ? "bg-green-500/10 text-green-500" :
                active.status === "PUBLISHED" ? "bg-blue-500/10 text-blue-500" : "bg-neutral-500/10 text-neutral-400"
              )}>
                {active.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              This inventory is scoped to the event selected in the top-right console switcher.
            </p>
          </div>
          <div className="text-xs text-muted-foreground sm:text-right">
            <div>Starts: {new Date(active.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div>Ends: {new Date(active.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-warning">
          No active event selected. Please select an event from the switcher in the header to view its stall inventory.
        </div>
      )}

      <div className="pt-2">
        <StallsTable stalls={stalls} />
      </div>
    </div>
  );
}
