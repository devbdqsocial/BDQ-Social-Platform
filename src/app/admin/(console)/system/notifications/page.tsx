import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/guard";
import { listNotifications } from "@/server/notifications/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markAllReadAction } from "../../notification-actions";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function NotificationsPage() {
  await requireAdmin();
  const items = await listNotifications(60);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Notifications" description="Recent alerts across the console." />
        {items.some((n) => !n.readAt) && (
          <form action={markAllReadAction}><Button type="submit" size="sm" variant="outline">Mark all read</Button></form>
        )}
      </div>
      <Card>
        <CardContent className="space-y-1 pt-6">
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
        </CardContent>
      </Card>
    </div>
  );
}
