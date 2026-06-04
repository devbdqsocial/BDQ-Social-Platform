import { requireAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { POSForm } from "./pos-form";

export default async function POSPage() {
  await requireAdmin();
  const { active } = await getActiveEvent();

  if (!active) {
    return (
      <div className="space-y-6">
        <PageHeader title="Point of Sale (POS)" description="Offline Ticket Issuance" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Please select an active event from the sidebar first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch ticket types for the active event
  const ticketTypes = await db.ticketType.findMany({
    where: { eventId: active.id },
    select: { id: true, name: true, priceInPaise: true, totalQty: true, soldQty: true },
    orderBy: { priceInPaise: "asc" }
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Point of Sale (POS)" 
        description={`Issue tickets manually at the gate for ${active.name}.`}
      />
      
      <POSForm eventId={active.id} ticketTypes={ticketTypes} />
    </div>
  );
}
