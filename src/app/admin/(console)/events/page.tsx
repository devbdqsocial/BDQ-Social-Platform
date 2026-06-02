import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listAllForAdmin } from "@/server/events/service";
import { PageHeader } from "@/components/ui/page-header";
import { EventsNav, EventList } from "./_components";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  await requireSuperAdmin();
  const now = Date.now();
  const events = (await listAllForAdmin()).filter((e) => e.endsAt.getTime() >= now);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Events" description="Create an event, add ticket prices, then publish it to go live on the public site." />
      <EventsNav active="all" />
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">All events ({events.length})</h2>
        <EventList events={events} empty="No upcoming events — create your first one." />
      </div>
    </div>
  );
}
