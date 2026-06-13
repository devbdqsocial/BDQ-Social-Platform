import type { Metadata } from "next";
import { fmtDate as fmt } from "@/lib/date-formats";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getContract } from "@/server/vendors/contract";
import { db } from "@/server/db";
import { formatPaise } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

const KYC_LABELS: Record<string, string> = { pan: "PAN card", fssai: "FSSAI licence", gst: "GST certificate", id: "Govt photo ID" };

export default async function VendorDocuments() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) redirect("/vendor/onboarding");

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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your agreement, receipts, event rules, and uploads — all in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Contract */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Vendor agreement</CardTitle>
              <Badge variant={contract?.status === "SIGNED" ? "success" : "warning"}>{contract?.status === "SIGNED" ? "Signed" : "Not signed"}</Badge>
            </div>
            <CardDescription>
              {contract?.status === "SIGNED" ? (
                contract.url ? (
                  <a href={contract.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Download signed PDF →</a>
                ) : (
                  "Signed — PDF copy unavailable."
                )
              ) : (
                <Link href="/vendor/onboarding?step=contract" className="text-primary hover:underline">Read &amp; sign →</Link>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Receipt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment receipt</CardTitle>
            <CardDescription>
              {booking?.payment ? (
                <>Stall fee {formatPaise(booking.payment.amount)} · {fmt(booking.payment.createdAt)} · #{booking.payment.id.slice(0, 8)}</>
              ) : (
                "Available after you pay for your stall."
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Stall pass + rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your stall</CardTitle>
            <CardDescription>
              {booking ? (
                <>Stall {booking.stall.label} · {booking.event.name} · {fmt(booking.event.startsAt)}</>
              ) : (
                "Reserve a stall to see your pass and timings."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <Link href="/vendor-rules" target="_blank" className="text-primary hover:underline">Event Rules</Link>
            <Link href="/vendor-booking-policy" target="_blank" className="text-primary hover:underline">Booking Policy</Link>
            <Link href="/vendor-data-policy" target="_blank" className="text-primary hover:underline">Data Policy</Link>
          </CardContent>
        </Card>

        {/* KYC docs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verification documents</CardTitle>
            <CardDescription>
              {kycDocs.length ? "Documents you uploaded." : "No documents uploaded yet."}
            </CardDescription>
          </CardHeader>
          {kycDocs.length > 0 && (
            <CardContent className="flex flex-wrap gap-3 text-sm">
              {kycDocs.map(([k, label]) => (
                <a key={k} href={docUrls[k]!.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{label}</a>
              ))}
              <Link href="/vendor/onboarding?step=docs" className="text-muted-foreground hover:text-foreground">Manage →</Link>
            </CardContent>
          )}
        </Card>
      </div>

      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand assets</CardTitle>
            <CardDescription>Your uploaded logo, banner, and product photos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {products.map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={a.id} src={a.url} alt={a.kind} className="size-16 rounded-md border border-border object-cover" />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
