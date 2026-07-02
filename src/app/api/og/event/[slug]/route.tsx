import { ImageResponse } from "next/og";
import { getBySlug } from "@/server/events/service";
import { db } from "@/server/db";
import { upgradeLayout } from "@/lib/map/layout-v2";
import { ogMapShapes, type OgMapShapes } from "@/lib/map/og-map";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

// Hex literals are required here — ImageResponse can't read CSS vars (same as /api/share/ticket).
const BG = "linear-gradient(135deg, #120E09 0%, #2a1d12 100%)";
const SAND = "#EDE6DA";
const GOLD = "#EFC65A";
const SAND_DIM = "#C9BDA8";
const SAND_MUTED = "#9c907c";

/**
 * Event social-share card (referenced by the event page's openGraph.images). Text block + a venue
 * silhouette (plot outline, zone fills, stall dots) when the event has a layout. A convention
 * opengraph-image file 404s for dynamic segments under turbopack, so this is a route handler like
 * /api/share/ticket. Build/DB-safe: any failure falls back to the text-only card.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let event: Awaited<ReturnType<typeof getBySlug>> = null;
  let map: OgMapShapes | null = null;
  try {
    event = await getBySlug(slug);
    if (event) {
      const row = await db.event.findUnique({ where: { slug }, select: { mapLayout: { select: { layoutJson: true } } } });
      if (row?.mapLayout) map = ogMapShapes(upgradeLayout(row.mapLayout.layoutJson), 380, 420);
    }
  } catch {
    map = null;
  }

  const when = event
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(event.startsAt)
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "80px",
          background: BG,
          color: SAND,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 }}>
          <div style={{ fontSize: 30, letterSpacing: 4, color: GOLD }}>BDQ SOCIAL</div>
          <div style={{ fontSize: map ? 68 : 80, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
            {event?.name ?? "Event"}
          </div>
          {when && <div style={{ fontSize: 36, marginTop: 24, color: SAND_DIM }}>{when}</div>}
          {event?.location && <div style={{ fontSize: 30, marginTop: 8, color: SAND_MUTED }}>{event.location}</div>}
        </div>
        {map && (
          <div style={{ display: "flex", flexShrink: 0, marginLeft: 48, opacity: 0.9 }}>
            <svg width={map.width} height={map.height} viewBox={`0 0 ${map.width} ${map.height}`}>
              {map.zones.map((z, i) => (
                <polygon key={`z${i}`} points={z.points} fill={z.fill} fillOpacity={0.28} />
              ))}
              {map.boundary && <polygon points={map.boundary} fill="none" stroke={GOLD} strokeWidth={2} strokeDasharray="8 5" />}
              {map.stalls.map((s, i) => (
                <rect key={`s${i}`} x={s.x} y={s.y} width={s.w} height={s.h} fill={SAND} fillOpacity={0.55} rx={1} />
              ))}
            </svg>
          </div>
        )}
      </div>
    ),
    size,
  );
}
