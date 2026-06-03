import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listStallsForEvent } from "@/server/map/admin-service";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StallsTable } from "./StallsTable";

export const metadata: Metadata = { title: "Stall inventory" };

export default async function StallInventoryPage() {
  await requireSuperAdmin();
  const { active } = await getActiveEvent();
  const stalls = active ? await listStallsForEvent(active.id) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Stall inventory" description={active ? `Every stall in ${active.name} and who has it.` : "Select an event from the switcher."} />
        <Button asChild size="sm" variant="outline"><Link href="/admin/venue/map">Open map builder</Link></Button>
      </div>
      <StallsTable stalls={stalls} />
    </div>
  );
}
