import type { Metadata } from "next";
import { fmtDate as fmt } from "@/lib/date-formats";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getContract } from "@/server/vendors/contract";
import { listEventRuleDocs, listPublishedDocs } from "@/server/legal/docs";
import { pathForSlug } from "@/lib/legal-docs";
import { db } from "@/server/db";
import { formatPaise } from "@/lib/utils";
import { cld } from "@/lib/cloudinary-url";
import { VendorPageHeader } from "@/components/vendor/VendorPageHeader";

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
  const kycDocs = profile.docs.filter((d) => KYC_LABELS[d.docType]);
  const products = profile.assets.filter((a) => a.kind === "PRODUCT" || a.kind === "LOGO" || a.kind === "BANNER");
  const signed = contract?.status === "SIGNED";

  // Rules & policies: docs assigned to the booked event + published vendor-audience docs +
  // the baseline vendor policies. PUBLIC docs keep their public URLs; VENDOR-only docs render
  // behind vendor auth at /vendor/documents/[slug]. Contract templates are excluded (they are
  // surfaced by the signing flows, not as reading material).
  const [assigned, vendorAudience, baseline] = await Promise.all([
    booking ? listEventRuleDocs(booking.eventId) : Promise.resolve([]),
    listPublishedDocs({ audience: ["VENDOR"] }),
    db.legalDocument.findMany({
      where: { slug: { in: ["vendor-rules", "vendor-booking-policy", "vendor-data-policy"] }, status: "PUBLISHED" },
      orderBy: { slug: "desc" },
    }),
  ]);
  const seen = new Set<string>();
  const readingDocs = [...assigned.map((a) => a.doc), ...baseline, ...vendorAudience.filter((d) => d.category !== "CONTRACT")]
    .filter((d) => !seen.has(d.id) && seen.add(d.id) !== undefined);

  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-2xl)]">
      <VendorPageHeader
        kicker="Documents"
        title="Documents"
        description="Your agreement, receipts, event rules, and uploads — all in one place."
      />

      <div className="grid gap-[var(--space-lg)] sm:grid-cols-2">
        {/* Contract */}
        <div className={TILE} style={tileStyle}>
          <div className="flex items-center justify-between gap-[var(--space-md)]">
            <h2 className="f-h32 f-exat">Vendor agreement</h2>
            <span className={signed ? "badge-bdq" : "badge-bdq badge-bdq--muted"}>{signed ? "Signed" : "Not signed"}</span>
          </div>
          {signed ? (
            contract?.url ? (
              <a href={contract.url} target="_blank" rel="noreferrer" className={LINK} style={{ color: "var(--light-blue)" }}>Download signed PDF →</a>
            ) : (
              <Link href="/vendor/contract" className={LINK} style={{ color: "var(--light-blue)" }}>View signed terms →</Link>
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
            {readingDocs.map((d) => (
              <Link
                key={d.id}
                href={d.audience === "PUBLIC" ? pathForSlug(d.slug) : `/vendor/documents/${d.slug}`}
                target="_blank"
                className={LINK}
                style={{ color: "var(--light-blue)" }}
              >
                {d.title}
              </Link>
            ))}
          </div>
        </div>

        {/* KYC docs — per-document verification status (vendor-portal §Documents) */}
        <div className={TILE} style={tileStyle}>
          <h2 className="f-h32 f-exat">Verification documents</h2>
          <p className="f-paragraph-small opacity-70">{kycDocs.length ? "Documents you uploaded." : "No documents uploaded yet."}</p>
          <div className="space-y-[var(--space-sm)] pt-[var(--space-xs)]">
            {kycDocs.map((d) => (
              <div key={d.docType} className="flex flex-wrap items-center gap-[var(--space-md)]">
                <a href={d.url} target="_blank" rel="noreferrer" className={LINK} style={{ color: "var(--light-blue)" }}>{KYC_LABELS[d.docType]}</a>
                {d.status === "VERIFIED" && <span className="badge-bdq">Verified</span>}
                {d.status === "PENDING" && <span className="badge-bdq badge-bdq--muted">In review</span>}
                {d.status === "REJECTED" && (
                  <span className="badge-bdq" style={{ background: "var(--red)", color: "var(--bgcolor)" }}>Re-upload needed</span>
                )}
              </div>
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
              <img key={a.id} src={cld(a.url, 128)} alt={a.kind} className="size-16 rounded-[var(--radius-md)] object-cover" style={tileStyle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
