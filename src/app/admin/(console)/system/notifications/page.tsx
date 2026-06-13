import type { Metadata } from "next";
import { fmtDateTime as fmt } from "@/lib/date-formats";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listNotifications } from "@/server/notifications/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { markAllReadAction } from "../../notification-actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdmin();
  const items = await listNotifications(60);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Notifications" description="Recent alerts across the console." />
        {items.some((n) => !n.readAt) && (
          <form action={markAllReadAction}><Button type="submit" size="sm" variant="outline">Mark all read</Button></form>
        )}
      </div>
      <div className="space-y-1 pt-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet — alerts will show up here.</p>
        ) : (
          items.map((n) => {
            const inner = (
              <div className={`rounded-md px-2 py-2 ${n.readAt ? "" : "bg-muted/40"}`}>
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-[10px] text-muted-foreground">{fmt(n.createdAt)}</p>
              </div>
            );
            return n.href ? <Link key={n.id} href={n.href} className="block hover:bg-muted">{inner}</Link> : <div key={n.id}>{inner}</div>;
          })
        )}
      </div>
    </div>
  );
}
