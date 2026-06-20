import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getOrgSettings } from "@/server/settings/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OrgForm } from "./OrgForm";

export const metadata: Metadata = { title: "Organization" };

/** The BDQ master account: legal + support details, used as the canonical org record. */
export default async function OrganizationSettingsPage() {
  await requireSuperAdmin();
  const org = await getOrgSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Organization" description="The BDQ master account — legal name, contacts, and identifiers." />
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Shown on receipts and used as the platform’s registered identity.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrgForm initial={org} />
        </CardContent>
      </Card>
    </div>
  );
}
