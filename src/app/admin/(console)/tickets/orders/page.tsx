import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listOrdersForEvent } from "@/server/tickets/admin-service";
import { PageHeader } from "@/components/ui/page-header";
import { OrdersTable } from "@/components/admin/tables/OrdersTable";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  await requirePermission("PAYMENT_VIEW");
  const { active } = await getActiveEvent();
  const orders = active ? await listOrdersForEvent(active.id) : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Orders" description={active ? `Ticket orders for ${active.name}.` : "Select an event from the switcher to see its orders."} />
      <OrdersTable orders={orders} />
    </div>
  );
}
