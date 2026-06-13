import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { getMap } from "@/server/map/maps";
import { ensureElementDefaults } from "@/server/map/elements";
import type { PaletteStallType } from "@/lib/map/designer-ops";
import { editorFromLayout } from "@/lib/map/layout-v2";
import { MapDesignerLoader } from "@/components/map/MapDesignerLoader";
import { getMapUploadSignatureAction } from "../../../events/[id]/map/actions";
import { saveMapLayoutAction } from "../actions";

export const metadata: Metadata = { title: "Map" };

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

export default async function MapDesignerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole();
  const { id } = await params;
  const map = await getMap(id);
  if (!map) notFound();

  const elements = await ensureElementDefaults();
  const palette: PaletteStallType[] = elements.map((e) => ({
    id: e.id, name: e.name, widthFt: e.widthFt, heightFt: e.heightFt, priceInPaise: 0, color: e.color, sellable: e.sellable,
  }));

  // Load both v1 and v2 layout docs through the one upgrade path (build-plan R2.5.1).
  const bridged = editorFromLayout(map.layoutJson);
  const initialElements = bridged.elements;
  const initialCanvas = bridged.elements.length || (map.layoutJson as { canvas?: unknown } | null)?.canvas
    ? bridged.canvas
    : { widthFt: map.widthFt, heightFt: map.heightFt, gridFt: map.gridFt };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{map.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(map.widthFt)}×{fmt(map.heightFt)} ft · {fmt(map.widthFt * map.heightFt)} sq ft
            {map.locationName ? ` · ${map.locationName}` : ""} · drop elements from the palette, then Save.
          </p>
        </div>
        <Link href="/admin/venue/maps" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All maps</Link>
      </header>

      <MapDesignerLoader
        eventId={map.id}
        initialElements={initialElements}
        initialCanvas={initialCanvas}
        stallTypes={palette}
        saveAction={saveMapLayoutAction}
        uploadAction={getMapUploadSignatureAction}
      />
    </div>
  );
}
