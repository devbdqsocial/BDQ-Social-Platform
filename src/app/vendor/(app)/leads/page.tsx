import type { Metadata } from "next";
import { fmtDateTime as fmt } from "@/lib/date-formats";
import QRCode from "qrcode";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { listLeads } from "@/server/leads/service";
import { CopyLinkButton } from "@/components/vendor/CopyLinkButton";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const domain = process.env.APP_BASE_DOMAIN;
const origin = domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";

const DAY = 86_400_000;
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

/** Count leads per local day, newest first (leads §6 "Tonight: 34" chips). */
function dayChips(leads: { createdAt: Date }[]) {
  const today = startOfDay(new Date());
  const counts = new Map<number, number>();
  for (const l of leads) {
    const k = startOfDay(l.createdAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 4)
    .map(([k, n]) => ({
      label: k === today ? "Today" : k === today - DAY ? "Yesterday" : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(k),
      n,
      isToday: k === today,
    }));
}

export default async function VendorLeadsPage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="f-paragraph-small opacity-70">Set up your brand profile first to collect leads.</p>;
  }

  const link = `${origin}/lead/${profile.id}`;
  const [qr, leads] = await Promise.all([QRCode.toDataURL(link, { width: 320, margin: 1 }), listLeads(profile.id)]);
  const chips = dayChips(leads);

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]">
      <VendorPageHeader
        className="print:hidden"
        kicker="Leads"
        title="Your leads"
        description="Put this QR on your stall — shoppers scan it to share their contact with you."
        action={
          leads.length > 0 ? (
            <a
              href="/api/vendor/leads/export"
              className="f-paragraph-small inline-flex min-h-9 items-center rounded-full border px-[var(--space-md)] py-[var(--space-xs)] font-bold"
              style={{ borderColor: "color-mix(in srgb, currentColor 35%, transparent)" }}
            >
              Export CSV
            </a>
          ) : undefined
        }
      />

      {/* QR tile — the print target (print CSS shows QR + brand only). */}
      <section
        className="flex flex-wrap items-center gap-[var(--space-xl)] rounded-[var(--radius-lg)] p-[var(--space-xl)]"
        style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Lead capture QR" className="size-[200px] rounded-[var(--radius-md)] bg-white p-[var(--space-sm)]" />
        <div className="min-w-0 space-y-[var(--space-sm)]">
          <p className="f-h32 f-exat">{profile.brandName}</p>
          <p className="f-paragraph-small opacity-70 print:hidden">Print this and put it where people queue — that&apos;s where leads happen.</p>
          <code className="f-paragraph-small block break-all opacity-70 print:hidden">{link}</code>
          <div className="print:hidden">
            <CopyLinkButton value={link} />
          </div>
        </div>
      </section>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-[var(--space-sm)] print:hidden">
          {chips.map((c) => (
            <span
              key={c.label}
              className={c.isToday ? "badge-bdq" : "f-paragraph-small rounded-full px-[var(--space-md)] py-[2px] font-bold"}
              style={c.isToday ? undefined : { border: "1px solid color-mix(in srgb, currentColor 28%, transparent)" }}
            >
              {c.label}: {c.n}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-[var(--space-md)] print:hidden">
        <h2 className="kicker opacity-60">Captured ({leads.length})</h2>
        {leads.length === 0 ? (
          <p className="f-paragraph-small opacity-70">No leads yet — share your QR at the market.</p>
        ) : (
          <ul className="overflow-hidden rounded-[var(--radius-lg)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
            {leads.map((l, i) => (
              <li
                key={l.id}
                className="flex min-h-14 items-center justify-between gap-[var(--space-md)] px-[var(--space-lg)] py-[var(--space-md)]"
                style={i > 0 ? { borderTop: "1px solid color-mix(in srgb, currentColor 12%, transparent)" } : undefined}
              >
                <div className="min-w-0">
                  <p className="f-paragraph truncate font-bold">{l.name ?? "—"}</p>
                  <p className="f-paragraph-small truncate opacity-60">{[l.phone, l.email].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <span className="f-paragraph-small shrink-0 opacity-55">{fmt(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
