import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminRole } from "@/server/auth/guard";
import { listAllForAdmin } from "@/server/events/service";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EventsTable } from "@/components/admin/tables/EventsTable";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  await requireAdminRole();
  const now = Date.now();
  const events = (await listAllForAdmin()).filter((e) => e.endsAt.getTime() >= now);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Events" description="Create an event, add ticket prices, then publish it to go live on the public site." />
        <Button asChild size="sm"><Link href="/admin/events/new">Create event</Link></Button>
      </div>
      <EventsTable events={events} />
    </div>
  );
}
