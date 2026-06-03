import type { Metadata } from "next";
import { requireCheckin } from "@/server/auth/guard";
import { listAllForAdmin } from "@/server/events/service";
import { Scanner } from "@/components/checkin/Scanner";
import { CapacityBoard } from "@/components/checkin/CapacityBoard";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check-in" };
export const dynamic = "force-dynamic";

export default async function CheckinPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  await requireCheckin();
  const { eventId } = await searchParams;
  const events = await listAllForAdmin();
  const activeId = eventId || events[0]?.id;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Gate check-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Point the camera at a ticket QR to scan.</p>
      </div>

      {events.length > 0 && (
        <form method="get" action="/admin/ops/checkin" className="flex items-end gap-2">
          <Select name="eventId" defaultValue={activeId} className="flex-1">
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Button type="submit" size="sm" variant="outline">Switch</Button>
        </form>
      )}

      {activeId && <CapacityBoard eventId={activeId} />}

      <Scanner />
    </div>
  );
}
