import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listSponsors } from "@/server/sponsors/service";
import { listAllForAdmin } from "@/server/events/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createSponsorAction } from "./actions";
import { SponsorsTable } from "./SponsorsTable";

export const metadata: Metadata = { title: "Sponsors" };
export const dynamic = "force-dynamic";

const TIERS = ["TITLE", "POWERED_BY", "ZONE", "STALL", "ASSOCIATE"] as const;
const tierLabel = (t: string) => t.toLowerCase().replace(/_/g, " ");

export default async function SponsorsPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  await requireSuperAdmin();
  const events = await listAllForAdmin();
  const { eventId } = await searchParams;
  const activeId = eventId || events[0]?.id;
  const sponsors = activeId ? await listSponsors(activeId) : [];

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Sponsors"
        description="Add partners and their logos — they appear on the landing page and the event page."
        actions={
          <form method="get" action="/admin/growth/sponsors" className="flex items-end gap-2">
            <Select name="eventId" defaultValue={activeId} className="w-56">
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <Button type="submit" size="sm" variant="outline">Switch</Button>
          </form>
        }
      />

      {activeId && (
        <Card asChild>
          <form action={createSponsorAction}>
            <input type="hidden" name="eventId" value={activeId} />
            <CardHeader>
              <CardTitle>Add a sponsor</CardTitle>
              <CardDescription>Paste a hosted logo URL, or leave it blank to show the name.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input name="name" required placeholder="Acme Co." />
              </Field>
              <Field label="Tier">
                <Select name="tier" defaultValue="ASSOCIATE">
                  {TIERS.map((t) => <option key={t} value={t}>{tierLabel(t)}</option>)}
                </Select>
              </Field>
              <Field label="Logo URL" hint="Optional." className="sm:col-span-2">
                <Input name="logoUrl" type="url" placeholder="https://…/logo.png" />
              </Field>
              <Button type="submit" className="w-fit sm:col-span-2">Add sponsor</Button>
            </CardContent>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Sponsors ({sponsors.length})</h2>
        <SponsorsTable sponsors={sponsors} />
      </div>
    </div>
  );
}
