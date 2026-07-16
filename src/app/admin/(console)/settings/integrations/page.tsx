import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { requireAdminRole } from "@/server/auth/guard";
import { integrationStatuses } from "@/server/settings/integrations";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Integrations" };

/** Read-only board of external services and whether their keys are configured. */
export default async function IntegrationsPage() {
  await requireAdminRole();
  const items = await integrationStatuses();

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" description="External services and their configuration status. Keys are managed via environment variables." />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <Card key={i.name}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.detail}</p>
              </div>
              {i.configured ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-4" /> Connected</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="size-4" /> Not configured</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
