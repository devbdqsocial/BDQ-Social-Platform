import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DangerZone } from "./DangerZone";

export const metadata: Metadata = { title: "Danger Zone" };

/** Irreversible event operations. SUPER_ADMIN only. */
export default async function DangerZonePage() {
  await requireSuperAdmin();
  const events = await db.event.findMany({
    orderBy: { startsAt: "desc" },
    select: { id: true, name: true, status: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Danger Zone" description="Irreversible actions. Read twice, click once." />
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Events</CardTitle>
          <CardDescription>Archive snapshots an event and frees storage (reversible). Delete is permanent.</CardDescription>
        </CardHeader>
        <CardContent>
          <DangerZone events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
