import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WizardSteps } from "@/components/admin/WizardSteps";
import { EventWizardBasics } from "@/components/admin/EventWizardBasics";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage() {
  await requireAdminRole();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Create event" description="Four quick steps — basics, tickets, layout, then publish. Each step saves as you go." />
      <WizardSteps current="basics" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The basics</CardTitle>
          <CardDescription>Name, dates and venue. You can refine everything before publishing.</CardDescription>
        </CardHeader>
        <CardContent>
          <EventWizardBasics />
        </CardContent>
      </Card>
    </div>
  );
}
