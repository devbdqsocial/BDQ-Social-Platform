import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listSponsors } from "@/server/sponsors/service";
import { listAllForAdmin } from "@/server/events/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { createSponsorAction, deleteSponsorAction } from "./actions";

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
          <form method="get" action="/admin/sponsors" className="flex items-end gap-2">
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
        {sponsors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsors for this event yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {sponsors.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  {s.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt="" className="h-8 w-auto rounded object-contain" />
                  )}
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="gold">{tierLabel(s.tier)}</Badge>
                </div>
                <form action={deleteSponsorAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm">Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
