import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Event Portal — Vadodara's premium experiences";

export default function OpengraphImage() {
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
        <div style={{ fontSize: 30, letterSpacing: 6, color: "#EFC65A", textTransform: "uppercase" }}>
          Vadodara · Curated events
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 92, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
          <span>Event</span>
          <span style={{ color: "#01065B" }}>Portal</span>
        </div>
        <div style={{ fontSize: 38, marginTop: 24, color: "#C9BDA8" }}>
          The city&apos;s most curated events
        </div>
      </div>
    ),
    size,
  );
}
