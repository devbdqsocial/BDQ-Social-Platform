import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getFlags, FEATURE_FLAGS } from "@/server/settings/service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FlagsForm } from "./FlagsForm";

export const metadata: Metadata = { title: "Feature Flags" };

/** Toggle customer-facing modules. Off hides the section (it returns empty; the existing empty-gate hides it). */
export default async function FlagsPage() {
  await requireSuperAdmin();
  const current = await getFlags();
  const flags = FEATURE_FLAGS.map((f) => ({ key: f.key, label: f.label, description: f.description, enabled: current[f.key] }));

  return (
    <div className="space-y-6">
      <PageHeader title="Feature Flags" description="Turn customer-facing modules on or off. Changes apply immediately." />
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>All on by default. Turning one off hides that section from customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <FlagsForm flags={flags} />
        </CardContent>
      </Card>
    </div>
  );
}
