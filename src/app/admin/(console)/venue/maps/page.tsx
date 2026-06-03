import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listMaps } from "@/server/map/maps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createMapAction } from "./actions";

export const metadata: Metadata = { title: "Maps" };

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

export default async function MapsPage() {
  await requireSuperAdmin();
  const maps = await listMaps();

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Maps" description="Reusable venue layouts. Build one to scale, then attach it to any event." />

      <Card asChild>
        <form action={createMapAction}>
          <CardHeader>
            <CardTitle>Create a map</CardTitle>
            <CardDescription>Enter the real venue size — a true-scale boundary box is drawn for you to design inside.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Map name" className="sm:col-span-2"><Input name="name" required placeholder="Aarush Lawn — main ground" /></Field>
            <Field label="Description" hint="Optional" className="sm:col-span-2"><Textarea name="description" rows={2} placeholder="Notes about this layout." /></Field>
            <Field label="Location" hint="Optional"><Input name="location" placeholder="Venue, City" /></Field>
            <Field label="Unit">
              <Select name="unit" defaultValue="FT"><option value="FT">Feet</option><option value="M">Meters</option></Select>
            </Field>
            <Field label="Width"><Input type="number" name="width" min={1} required placeholder="400" /></Field>
            <Field label="Length"><Input type="number" name="length" min={1} required placeholder="250" /></Field>
            <Field label="Grid size (ft)">
              <Select name="gridFt" defaultValue="5">
                {[1, 2, 5, 10].map((g) => <option key={g} value={g}>{g} ft</option>)}
              </Select>
            </Field>
            <Button type="submit" className="w-fit sm:col-span-2">Create map</Button>
          </CardContent>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">All maps ({maps.length})</h2>
        {maps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maps yet — create your first one above.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {maps.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-4">
                <Link href={`/admin/venue/maps/${m.id}`} className="group min-w-0">
                  <p className="truncate font-medium group-hover:text-primary">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(m.widthFt)}×{fmt(m.heightFt)} ft · {fmt(m.widthFt * m.heightFt)} sq ft{m.locationName ? ` · ${m.locationName}` : ""}
                  </p>
                </Link>
                <Button asChild variant="outline" size="sm"><Link href={`/admin/venue/maps/${m.id}`}>Open</Link></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
