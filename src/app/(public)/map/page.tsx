import type { Metadata } from "next";
import { MapPreview } from "@/components/map/MapPreview";
import { buildAarushLawnTemplate } from "@/server/map/seed-aarush-lawn";
import { assignDemoStatuses } from "@/server/map/demo-status";

export const metadata: Metadata = { title: "Event layout" };

export default function MapPage() {
  const layout = buildAarushLawnTemplate();
  const statuses = assignDemoStatuses(layout);

  return (
    <section className="paint py-[var(--space-4xl)]">
      <div className="wrapper">
        <span className="f-paragraph-small f-bold t-upper opacity-70" style={{ letterSpacing: "0.18em" }}>The venue</span>
        <h1 className="f-exat mt-[var(--space-sm)] f-h76">
          Take a look around
        </h1>
        <p className="f-paragraph mt-[var(--space-md)] max-w-[52ch] opacity-80">
          The full venue layout — stages, food court, lounges, and every stall. Scroll to zoom, drag to
          move around, and tap a stall to see it up close.
        </p>
        <div className="mt-[var(--space-2xl)]">
          <MapPreview layout={layout} statuses={statuses} />
        </div>
      </div>
    </section>
  );
}
