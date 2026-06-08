import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { listAllForAdmin } from "@/server/events/service";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { UnifiedWaitlistTable } from "./UnifiedWaitlistTable";

export const metadata: Metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  await requirePermission("CUSTOMER_VIEW");

  // Fetch events list for dropdown
  const events = await listAllForAdmin();

  // Fetch platform waitlist entries
  const platformEntries = await db.waitlist.findMany({
    where: { source: "PLATFORM" },
    orderBy: { createdAt: "desc" },
  });

  // Fetch event waitlist entries
  const eventEntries = await db.waitlist.findMany({
    where: { source: "EVENT" },
    include: {
      event: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waitlist"
        description="Unified subscriber feed from the coming-soon page and event waitlists."
      />

      <UnifiedWaitlistTable
        platformEntries={platformEntries as any}
        eventEntries={eventEntries as any}
        events={events}
      />
    </div>
  );
}
