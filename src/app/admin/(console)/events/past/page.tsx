import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listAllForAdmin } from "@/server/events/service";
import { PageHeader } from "@/components/ui/page-header";
import { EventsNav } from "../_components";
import { EventsTable } from "../EventsTable";

export const metadata: Metadata = { title: "Past events" };

export default async function AdminPastEventsPage() {
  await requireSuperAdmin();
  const now = Date.now();
  const events = (await listAllForAdmin()).filter((e) => e.endsAt.getTime() < now);

  return (
    <div className="space-y-6">
      <PageHeader title="Past events" description="Events that have already ended." />
      <EventsNav active="past" />
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Past events ({events.length})</h2>
        <EventsTable events={events} />
      </div>
    </div>
  );
}
