import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getAnalyticsSettings } from "@/server/settings/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnalyticsForm } from "./AnalyticsForm";

export const metadata: Metadata = { title: "Analytics" };

/** Tracking IDs. Scripts load on the public site only when an ID is set. */
export default async function AnalyticsSettingsPage() {
  await requireSuperAdmin();
  const a = await getAnalyticsSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Add tracking IDs to enable GA4, Meta Pixel, or Clarity. Leave blank to disable." />
      <Card>
        <CardHeader>
          <CardTitle>Tracking IDs</CardTitle>
          <CardDescription>Scripts are injected only when an ID is present.</CardDescription>
        </CardHeader>
        <CardContent><AnalyticsForm initial={a} /></CardContent>
      </Card>
    </div>
  );
}
