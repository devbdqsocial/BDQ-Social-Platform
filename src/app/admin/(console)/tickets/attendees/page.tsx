import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listTicketsForEvent } from "@/server/tickets/admin-service";
import { PageHeader } from "@/components/ui/page-header";
import { AttendeesTable } from "./AttendeesTable";

export const metadata: Metadata = { title: "Attendees" };

export default async function AttendeesPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const tickets = active ? await listTicketsForEvent(active.id) : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Attendees" description={active ? `Issued tickets for ${active.name}.` : "Select an event from the switcher to see its attendees."} />
      <AttendeesTable tickets={tickets} />
    </div>
  );
}
