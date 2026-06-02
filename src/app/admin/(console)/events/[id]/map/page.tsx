import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getByIdForAdmin } from "@/server/events/service";
import { seedToEditor, type EditorElement } from "@/lib/map/designer-ops";
import { MapDesignerLoader } from "@/components/map/MapDesignerLoader";
import { saveMapAction } from "./actions";

export const metadata: Metadata = { title: "Event layout" };

export default async function EventMapPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const event = await getByIdForAdmin(id);
  if (!event) notFound();

  const saved = event.mapLayout?.layoutJson as { elements?: EditorElement[] } | null;
  const initialElements = saved?.elements ?? seedToEditor();

  return (
    <div>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Event layout · {event.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
            Arrange stalls, stages, and zones to scale, and set each stall&apos;s price. Saving updates this event&apos;s live map.
          </p>
        </div>
        <Link href={`/admin/events/${event.id}`} className="shrink-0 text-sm text-muted-foreground hover:text-foreground">
          ← Back to event
        </Link>
      </header>
      <MapDesignerLoader eventId={event.id} initialElements={initialElements} saveAction={saveMapAction} />
    </div>
  );
}
