import { ImageResponse } from "next/og";
import { getTicketShareData } from "@/server/tickets/share";

export const runtime = "nodejs";

// RPA palette (globals.css). Hex literals are required here — ImageResponse can't read CSS vars.
const NAVY = "#01065B";
const LAV = "#868EFF";
const CREAM = "#F4F2EC";
const YELLOW = "#D0F95F";
const PINK = "#FF58AC";
const MIST = "#C9CCF0"; // venue line
const MIST_DIM = "#9AA0D8"; // footer line

const SIZES = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
} as const;

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(d);

/**
 * Ticket share art (R6.1). A premium, on-brand image a guest WANTS to post — never a ticket export.
 * Security (locked): the scannable QR / phone / email never appear here. Public by non-enumerable
 * cuid; renders only fields the guest is choosing to share. Cached (deterministic per ticket).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(_req.url);
  const format = url.searchParams.get("format") === "post" ? "post" : "story";
  const size = SIZES[format];

  const data = await getTicketShareData(id);
  if (!data) return new Response("Not found", { status: 404 });

  // Use ImageResponse's bundled default font (reliable in every runtime; a local-font fetch fails in
  // turbopack dev). Display weight via fontWeight 700 — the look comes from the RPA palette + layout.
  const pad = format === "story" ? 110 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: pad,
          backgroundColor: NAVY,
          backgroundImage: `radial-gradient(120% 70% at 50% -8%, rgba(134,142,255,0.42), rgba(1,6,91,0) 60%), radial-gradient(90% 60% at 85% 112%, rgba(134,142,255,0.20), rgba(1,6,91,0) 55%)`,
          color: CREAM,
        }}
      >
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: LAV }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>
            BDQ<span style={{ color: CREAM }}>.</span>
          </div>
          <div style={{ fontSize: 22, letterSpacing: 6, opacity: 0.7 }}>BDQ SOCIAL</div>
        </div>

        {/* Hero — the attendance emotion is the loudest thing */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: LAV, marginBottom: 18 }}>I&apos;M GOING TO</div>
          <div style={{ display: "flex", fontWeight: 700, fontSize: format === "story" ? 132 : 110, lineHeight: 1.02, color: CREAM }}>
            {data.eventName}
          </div>
          <div style={{ display: "flex", height: 10, width: 180, backgroundColor: YELLOW, marginTop: 40 }} />
          <div style={{ display: "flex", fontSize: 44, marginTop: 40, color: CREAM }}>{fmtDate(data.startsAt)}</div>
          {data.location && <div style={{ display: "flex", fontSize: 34, marginTop: 14, color: MIST }}>{data.location}</div>}
        </div>

        {/* Guest + ticket */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
            <div style={{ display: "flex", fontSize: 24, padding: "12px 26px", borderRadius: 999, backgroundColor: LAV, color: NAVY, letterSpacing: 2 }}>
              {data.ticketType.toUpperCase()}
            </div>
          </div>
          {data.holderName && <div style={{ display: "flex", fontWeight: 700, fontSize: 58, color: CREAM }}>{data.holderName}</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 44, color: MIST_DIM, fontSize: 26 }}>
            <div style={{ display: "flex" }}>bdqsocial.com</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: LAV }} />
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: YELLOW }} />
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: PINK }} />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400" },
    },
  );
}
