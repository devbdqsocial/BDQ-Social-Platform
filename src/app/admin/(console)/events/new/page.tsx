import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NewEventForm } from "@/components/admin/NewEventForm";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage() {
  await requireAdminRole();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Create event" description="Fill in the details — you'll add tickets, a map, and everything else on the next screen." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event details</CardTitle>
          <CardDescription>Name, dates and the public-page basics. Tickets, pricing, map and lineup come next.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewEventForm />
        </CardContent>
      </Card>
    </div>
  );
}
