import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { getByIdForAdmin } from "@/server/events/service";
import { ensureStallTypes } from "@/server/map/stall-types";
import { listTemplates } from "@/server/map/templates";
import { DEFAULT_CANVAS, type CanvasMeta, type EditorElement, type PaletteStallType } from "@/lib/map/designer-ops";
import { MapDesignerLoader } from "@/components/map/MapDesignerLoader";
import { StallTypesManager } from "./StallTypesManager";
import { TemplatesBar } from "./TemplatesBar";
import { saveMapAction, getMapUploadSignatureAction } from "./actions";

export const metadata: Metadata = { title: "Event layout" };

export default async function EventMapPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole();
  const { id } = await params;
  const event = await getByIdForAdmin(id);
  if (!event) notFound();

  const [types, templates] = await Promise.all([ensureStallTypes(event.id), listTemplates()]);
  const palette: PaletteStallType[] = types.map((t) => ({
    id: t.id,
    name: t.name,
    widthFt: t.widthFt,
    heightFt: t.heightFt,
    priceInPaise: t.priceInPaise,
    color: t.color,
    sellable: t.sellable,
  }));

  const saved = event.mapLayout?.layoutJson as { elements?: EditorElement[]; canvas?: CanvasMeta } | null;
  const initialElements = saved?.elements ?? [];
  const initialCanvas = saved?.canvas ?? DEFAULT_CANVAS;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Event layout · {event.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            Set the venue size, define stall types, then arrange stalls and zones to scale. Saving updates this event&apos;s live map.
          </p>
        </div>
        <Link href={`/admin/events/${event.id}`} className="shrink-0 text-sm text-muted-foreground hover:text-foreground">
          ← Back to event
        </Link>
      </header>

      <TemplatesBar eventId={event.id} templates={templates} />

      <StallTypesManager eventId={event.id} types={types} />

      <MapDesignerLoader
        eventId={event.id}
        initialElements={initialElements}
        initialCanvas={initialCanvas}
        stallTypes={palette}
        saveAction={saveMapAction}
        uploadAction={getMapUploadSignatureAction}
      />
    </div>
  );
}
