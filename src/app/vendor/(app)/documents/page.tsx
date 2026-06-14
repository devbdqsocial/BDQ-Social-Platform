import type { Metadata } from "next";
import { fmtDate as fmt } from "@/lib/date-formats";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getContract } from "@/server/vendors/contract";
import { db } from "@/server/db";
import { formatPaise } from "@/lib/utils";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

const KYC_LABELS: Record<string, string> = { pan: "PAN card", fssai: "FSSAI licence", gst: "GST certificate", id: "Govt photo ID" };

const tileStyle = { border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" } as const;
const TILE = "rounded-[var(--radius-lg)] p-[var(--space-lg)] space-y-[var(--space-sm)]";
const LINK = "f-paragraph-small font-bold underline underline-offset-2";

export default async function VendorDocuments() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) redirect("/vendor/home");

  const contract = await getContract(profile.id);
  const booking = await db.booking.findFirst({
    where: { vendorProfileId: profile.id, status: { in: ["PENDING_PAYMENT", "BOOKED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      stall: { select: { label: true } },
      event: { select: { name: true, startsAt: true } },
      payment: { select: { id: true, amount: true, createdAt: true } },
    },
  });
  const docUrls = (profile.kyc?.docUrls as Record<string, { url: string } | undefined> | null) ?? {};
  const kycDocs = Object.entries(KYC_LABELS).filter(([k]) => docUrls[k]?.url);
  const products = profile.assets.filter((a) => a.kind === "PRODUCT" || a.kind === "LOGO" || a.kind === "BANNER");
  const signed = contract?.status === "SIGNED";

  return (
    <div className="max-w-3xl space-y-[var(--space-2xl)]">
      <div>
        <p className="kicker opacity-60">Documents</p>
        <h1 className="f-exat f-h60 mt-1">Documents</h1>
        <p className="f-paragraph-small mt-[var(--space-sm)] opacity-75">Your agreement, receipts, event rules, and uploads — all in one place.</p>
      </div>

      <div className="grid gap-[var(--space-lg)] sm:grid-cols-2">
        {/* Contract */}
        <div className={TILE} style={tileStyle}>
          <div className="flex items-center justify-between gap-[var(--space-md)]">
            <h2 className="f-h32 f-exat">Vendor agreement</h2>
            <span className={signed ? "badge-rpa" : "badge-rpa badge-rpa--muted"}>{signed ? "Signed" : "Not signed"}</span>
          </div>
          {signed ? (
            contract?.url ? (
              <a href={contract.url} target="_blank" rel="noreferrer" className={LINK} style={{ color: "var(--light-blue)" }}>Download signed PDF →</a>
            ) : (
              <p className="f-paragraph-small opacity-70">Signed — PDF copy unavailable.</p>
            )
          ) : (
            <Link href="/vendor/home?step=contract" className={LINK} style={{ color: "var(--light-blue)" }}>Read &amp; sign →</Link>
          )}
        </div>

        {/* Receipt */}
        <div className={TILE} style={tileStyle}>
          <h2 className="f-h32 f-exat">Payment receipt</h2>
          <p className="f-paragraph-small opacity-70 text-pretty">
            {booking?.payment ? (
              <>Stall fee {formatPaise(booking.payment.amount)} · {fmt(booking.payment.createdAt)} · #{booking.payment.id.slice(0, 8)}</>
            ) : (
              "Available after you pay for your stall."
            )}
          </p>
        </div>

        {/* Stall + rules */}
        <div className={TILE} style={tileStyle}>
          <h2 className="f-h32 f-exat">Your stall</h2>
          <p className="f-paragraph-small opacity-70 text-pretty">
            {booking ? <>Stall {booking.stall.label} · {booking.event.name} · {fmt(booking.event.startsAt)}</> : "Reserve a stall to see your pass and timings."}
          </p>
          <div className="flex flex-wrap gap-[var(--space-md)] pt-[var(--space-xs)]">
            <Link href="/vendor-rules" target="_blank" className={LINK} style={{ color: "var(--light-blue)" }}>Event Rules</Link>
            <Link href="/vendor-booking-policy" target="_blank" className={LINK} style={{ color: "var(--light-blue)" }}>Booking Policy</Link>
            <Link href="/vendor-data-policy" target="_blank" className={LINK} style={{ color: "var(--light-blue)" }}>Data Policy</Link>
          </div>
        </div>

        {/* KYC docs */}
        <div className={TILE} style={tileStyle}>
          <h2 className="f-h32 f-exat">Verification documents</h2>
          <p className="f-paragraph-small opacity-70">{kycDocs.length ? "Documents you uploaded." : "No documents uploaded yet."}</p>
          <div className="flex flex-wrap items-center gap-[var(--space-md)] pt-[var(--space-xs)]">
            {kycDocs.map(([k, label]) => (
              <a key={k} href={docUrls[k]!.url} target="_blank" rel="noreferrer" className={LINK} style={{ color: "var(--light-blue)" }}>{label}</a>
            ))}
            <Link href="/vendor/home?step=docs" className="f-paragraph-small font-bold opacity-60 hover:opacity-100">Manage →</Link>
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <div className={TILE} style={tileStyle}>
          <h2 className="f-h32 f-exat">Brand assets</h2>
          <p className="f-paragraph-small opacity-70">Your uploaded logo, banner, and product photos.</p>
          <div className="flex flex-wrap gap-[var(--space-md)] pt-[var(--space-xs)]">
            {products.map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={a.id} src={a.url} alt={a.kind} className="size-16 rounded-[var(--radius-md)] object-cover" style={tileStyle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
