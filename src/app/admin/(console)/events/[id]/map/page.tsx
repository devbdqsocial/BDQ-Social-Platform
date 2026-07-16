import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { getByIdForAdmin, resolveAdminEventId } from "@/server/events/service";
import { ensureStallTypes } from "@/server/map/stall-types";
import { getMap } from "@/server/map/maps";
import { type PaletteStallType } from "@/lib/map/designer-ops";
import { editorFromLayout, upgradeLayout } from "@/lib/map/layout-v2";
import { MapDesignerLoader } from "@/components/map/MapDesignerLoader";
import { StallTypesManager } from "./StallTypesManager";
import { SaveToLibrary } from "./SaveToLibrary";
import { saveMapAction, getMapUploadSignatureAction } from "./actions";

export const metadata: Metadata = { title: "Event layout" };

export default async function EventMapPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole();
  const { id: idOrSlug } = await params;
  const id = await resolveAdminEventId(idOrSlug);
  const event = id ? await getByIdForAdmin(id) : null;
  if (!event) notFound();

  const [types, linkedMap] = await Promise.all([
    ensureStallTypes(event.id),
    event.mapId ? getMap(event.mapId) : null,
  ]);
  const palette: PaletteStallType[] = types.map((t) => ({
    id: t.id,
    name: t.name,
    widthFt: t.widthFt,
    heightFt: t.heightFt,
    priceInPaise: t.priceInPaise,
    color: t.color,
    sellable: t.sellable,
  }));

  // Load both v1 and v2 layout docs through the one upgrade path (build-plan R2.5.1).
  const { elements: initialElements, canvas: initialCanvas } = editorFromLayout(
    event.mapLayout?.layoutJson,
    event.mapLayout?.opsLayerJson,
  );
  const initialLayout = upgradeLayout(event.mapLayout?.layoutJson, event.mapLayout?.opsLayerJson);

  // Real attendance for the entry-flow throughput verdict (R2.5.17) — Σ ticket-type capacity.
  const expectedAttendance = event.ticketTypes.reduce((sum, t) => sum + t.totalQty, 0);

  // How many stalls of each type are currently placed on the map (read-only usage hint).
  const placedByType: Record<string, number> = {};
  for (const el of initialElements) {
    if (el.kind === "stall" && el.stallTypeId) placedByType[el.stallTypeId] = (placedByType[el.stallTypeId] ?? 0) + 1;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Event layout · {event.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            Set the venue size, define stall types, then arrange stalls and zones to scale. Saving updates this event&apos;s live map.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SaveToLibrary eventId={event.id} linkedMap={linkedMap ? { id: linkedMap.id, name: linkedMap.name } : null} />
          <Link href={`/admin/events/${event.id}?tab=stalls`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Stalls
          </Link>
        </div>
      </header>

      <StallTypesManager eventId={event.id} types={types} placedByType={placedByType} />

      <MapDesignerLoader
        eventId={event.id}
        initialElements={initialElements}
        initialCanvas={initialCanvas}
        initialLayout={initialLayout}
        stallTypes={palette}
        expectedAttendance={expectedAttendance}
        saveAction={saveMapAction}
        uploadAction={getMapUploadSignatureAction}
      />
    </div>
  );
}
