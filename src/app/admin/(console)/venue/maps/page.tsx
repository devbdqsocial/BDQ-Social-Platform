import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminRole } from "@/server/auth/guard";
import { listMaps } from "@/server/map/maps";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Maps" };

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

export default async function MapsPage() {
  await requireAdminRole();
  const maps = await listMaps();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="All maps" description="Reusable venue layouts. Build one to scale, then attach it to any event." />
        <Button asChild size="sm"><Link href="/admin/venue/maps/new">Create map</Link></Button>
      </div>

      <div className="space-y-3">
        {maps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maps yet — create your first one using the button above.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {maps.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-4">
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
