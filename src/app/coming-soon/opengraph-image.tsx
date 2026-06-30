import { ImageResponse } from "next/og";
import { listPublished } from "@/server/events/service";

export const runtime = "nodejs";
export const alt = "BDQ Social — get your invite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// BDQ palette (hex literals — ImageResponse can't read CSS vars). Bundled default font; look from palette.
const NAVY = "#01065B";
const LAV = "#868EFF";
const CREAM = "#F4F2EC";
const YELLOW = "#D0F95F";

export default async function Image() {
  // Resilient to a missing DB at build time (CI prerenders this with no database) — fall back gracefully.
  let next: Awaited<ReturnType<typeof listPublished>>[number] | undefined;
  try {
    next = (await listPublished())[0];
  } catch {
    next = undefined;
  }
  const dateLine = next
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(next.startsAt)
    : "Doors open soon";
  const place = next?.location ?? "Vadodara";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 84,
          backgroundColor: NAVY,
          backgroundImage:
            "radial-gradient(120% 70% at 50% -8%, rgba(134,142,255,0.42), rgba(1,6,91,0) 60%), radial-gradient(90% 60% at 88% 112%, rgba(208,249,95,0.16), rgba(1,6,91,0) 55%)",
          color: CREAM,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: LAV }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, letterSpacing: 1 }}>
            BDQ<span style={{ color: CREAM }}>.</span>
          </div>
          <div style={{ fontSize: 22, letterSpacing: 6, opacity: 0.7 }}>VADODARA</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: LAV, marginBottom: 16 }}>GET YOUR INVITE</div>
          <div style={{ display: "flex", fontWeight: 700, fontSize: 96, lineHeight: 1.02 }}>
            Vadodara&apos;s night market.
          </div>
          <div style={{ display: "flex", height: 10, width: 200, backgroundColor: YELLOW, marginTop: 36 }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: CREAM, opacity: 0.92 }}>
          <span>{place}</span>
          <span>{dateLine}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
