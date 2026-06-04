import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { listWaitlist } from "@/server/waitlist/service";
import { listAllForAdmin } from "@/server/events/service";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { notifyWaitlistAction } from "./actions";

export const metadata: Metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  await requirePermission("CUSTOMER_VIEW");
  const events = await listAllForAdmin();
  const { eventId } = await searchParams;
  const activeId = eventId || events[0]?.id;
  const entries = activeId ? await listWaitlist(activeId) : [];
  const waiting = entries.filter((e) => !e.notifiedAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waitlist"
        description="People who asked to be notified when tickets open up."
        actions={
          <form method="get" action="/admin/growth/waitlist" className="flex items-end gap-2">
            <Select name="eventId" defaultValue={activeId} className="w-56">
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <Button type="submit" size="sm" variant="outline">Switch</Button>
          </form>
        }
      />

      {activeId && waiting > 0 && (
        <form action={notifyWaitlistAction} className="flex items-center justify-between gap-3 border-y border-border py-4">
          <input type="hidden" name="eventId" value={activeId} />
          <p className="text-sm">{waiting} waiting to hear back.</p>
          <Button type="submit" size="sm">Notify available ({waiting})</Button>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one on the waitlist for this event.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.contact ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{e.type.toLowerCase()} · {fmt(e.createdAt)}</p>
              </div>
              {e.notifiedAt ? <Badge variant="success">Notified</Badge> : <Badge variant="warning">Waiting</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
