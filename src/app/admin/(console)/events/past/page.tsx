import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listAllForAdmin } from "@/server/events/service";
import { PageHeader } from "@/components/ui/page-header";
import { EventsTable } from "../EventsTable";

export const metadata: Metadata = { title: "Past events" };

export default async function AdminPastEventsPage() {
  await requireSuperAdmin();
  const now = Date.now();
  const events = (await listAllForAdmin()).filter((e) => e.endsAt.getTime() < now);

  return (
    <div className="space-y-4">
      <PageHeader title="Past events" description="Events that have already ended." />
      <EventsTable events={events} />
    </div>
  );
}
