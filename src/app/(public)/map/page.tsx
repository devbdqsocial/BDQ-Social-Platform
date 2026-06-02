import type { Metadata } from "next";
import { MapPreview } from "@/components/map/MapPreview";
import { buildAarushLawnTemplate } from "@/server/map/seed-aarush-lawn";
import { assignDemoStatuses } from "@/server/map/demo-status";

export const metadata: Metadata = { title: "Event layout" };

export default function MapPage() {
  const layout = buildAarushLawnTemplate();
  const statuses = assignDemoStatuses(layout);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Take a look around</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground text-pretty">
          The full venue layout — stages, food court, lounges, and every stall. Scroll to zoom,
          drag to move around, and tap a stall to see it up close.
        </p>
      </header>
      <MapPreview layout={layout} statuses={statuses} />
    </main>
  );
}
