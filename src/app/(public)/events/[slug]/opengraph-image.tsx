import { ImageResponse } from "next/og";
import { getBySlug } from "@/server/events/service";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BDQ Social event";

export default async function EventOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getBySlug(slug);
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
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #120E09 0%, #2a1d12 100%)",
          color: "#EDE6DA",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 4, color: "#EFC65A" }}>BDQ SOCIAL</div>
        <div style={{ fontSize: 80, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
          {event?.name ?? "Event"}
        </div>
        {when && <div style={{ fontSize: 36, marginTop: 24, color: "#C9BDA8" }}>{when}</div>}
        {event?.location && <div style={{ fontSize: 30, marginTop: 8, color: "#9c907c" }}>{event.location}</div>}
      </div>
    ),
    size,
  );
}
