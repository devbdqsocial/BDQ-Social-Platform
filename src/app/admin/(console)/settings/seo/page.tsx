import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getSeoSettings } from "@/server/settings/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SeoForm } from "./SeoForm";

export const metadata: Metadata = { title: "SEO" };

/** Site-wide SEO defaults. Blank fields keep the built-in defaults. */
export default async function SeoSettingsPage() {
  await requireSuperAdmin();
  const seo = await getSeoSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="SEO" description="Default title, description, and share image for the public site." />
      <Card>
        <CardHeader>
          <CardTitle>Site metadata</CardTitle>
          <CardDescription>Per-page titles still apply; these are the site-wide defaults.</CardDescription>
        </CardHeader>
        <CardContent><SeoForm initial={seo} /></CardContent>
      </Card>
    </div>
  );
}
