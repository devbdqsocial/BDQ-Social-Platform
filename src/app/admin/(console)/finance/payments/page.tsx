import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listPaymentsForEvent } from "@/server/finance/service";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentsTable } from "./PaymentsTable";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requireSuperAdmin();
  const { active } = await getActiveEvent();
  const payments = active ? await listPaymentsForEvent(active.id) : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description={active ? `All payments for ${active.name} — tickets and stalls.` : "Select an event from the switcher."} />
      <PaymentsTable payments={payments} />
    </div>
  );
}
