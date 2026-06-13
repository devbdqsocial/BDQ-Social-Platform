import type { Metadata } from "next";
import { fmtDateTime as fmt } from "@/lib/date-formats";
import QRCode from "qrcode";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { listLeads } from "@/server/leads/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const domain = process.env.APP_BASE_DOMAIN;
const origin = domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";



export default async function VendorLeadsPage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="text-sm text-muted-foreground">Set up your brand profile first to collect leads.</p>;
  }

  const link = `${origin}/lead/${profile.id}`;
  const [qr, leads] = await Promise.all([QRCode.toDataURL(link, { width: 320, margin: 1 }), listLeads(profile.id)]);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Leads"
        description="Put this QR on your stall — shoppers scan it to share their contact with you."
        actions={
          leads.length > 0 ? (
            <Button asChild size="sm" variant="outline"><a href="/api/vendor/leads/export">Export CSV</a></Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your capture link</CardTitle>
          <CardDescription>Print the QR or share the link.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Lead capture QR" className="size-32 rounded-lg border border-border bg-white p-2" />
          <code className="break-all text-sm text-muted-foreground">{link}</code>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Captured ({leads.length})</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads yet — share your QR at the market.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {leads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{[l.phone, l.email].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{fmt(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
