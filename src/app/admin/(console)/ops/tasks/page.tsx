import type { Metadata } from "next";
import Link from "next/link";
import { Clock, UserCheck, XCircle, Ticket as TicketIcon, BellRing, CheckCircle2 } from "lucide-react";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { getOpsSnapshot } from "@/server/ops/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Task Center" };
export const dynamic = "force-dynamic";

export default async function TaskCenterPage() {
  await requireSuperAdmin();
  const { active } = await getActiveEvent();
  const { pending } = await getOpsSnapshot(active?.id);

  const tasks = [
    { n: pending.approvals, label: "vendor application(s) awaiting review", href: "/admin/vendors", icon: UserCheck },
    { n: pending.expiringHolds, label: "stall hold(s) expiring within the hour", href: "/admin/venue/stalls", icon: Clock },
    { n: pending.failedPayments, label: "failed payment(s) in the last 7 days", href: "/admin/finance/payments", icon: XCircle },
    { n: pending.soldOutTypes, label: "ticket type(s) sold out", href: "/admin/tickets/orders", icon: TicketIcon },
    { n: pending.waitlist, label: "people on the waitlist", href: "/admin/waitlist", icon: BellRing },
  ].filter((t) => t.n > 0);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Task Center" description={active ? `What needs attention for ${active.name}.` : "Pending items across events."} />
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm">
          {tasks.length === 0 ? (
            <p className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-success" /> Nothing pending — you&apos;re all caught up.</p>
          ) : (
            tasks.map((t) => (
              <Link key={t.label} href={t.href} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                <span className="grid size-8 place-items-center rounded-md bg-muted"><t.icon className="size-4" /></span>
                <span><span className="text-base font-semibold">{t.n}</span> {t.label}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
