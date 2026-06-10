import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/guard";
import { getVendor, listAssignableStalls } from "@/server/vendors/admin-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { approveAction, approveForPaymentAction, assignStallAction, logCallbackAction, rejectAction } from "./actions";

export const metadata: Metadata = { title: "Vendor" };

const STATUS: Record<string, { label: string; variant: "primary" | "warning" | "success" | "danger" }> = {
  SUBMITTED: { label: "New", variant: "primary" },
  UNDER_REVIEW: { label: "Reviewing", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Declined", variant: "danger" },
};

export default async function AdminVendorDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("VENDOR_VIEW");
  const { id } = await params;
  const v = await getVendor(id);
  if (!v) notFound();
  const stalls = await listAssignableStalls();
  const socials = (v.socials as { instagram?: string } | null) ?? null;
  const decided = v.approvalStatus === "APPROVED" || v.approvalStatus === "REJECTED";
  const status = STATUS[v.approvalStatus];
  const docUrls = (v.kyc?.docUrls as Record<string, { url: string } | undefined> | null) ?? {};
  const KYC_DOC_LABELS: Record<string, string> = { pan: "PAN card", fssai: "FSSAI", gst: "GST cert", id: "Photo ID" };
  const kycDocs = Object.entries(KYC_DOC_LABELS).filter(([k]) => docUrls[k]?.url);
  const reserved = v.bookings.find((b) => b.status === "RESERVED");
  const signed = v.contract?.status === "SIGNED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">{v.brandName}</h1>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>
        <Link href="/admin/vendors" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All vendors</Link>
      </div>

      <Card>
        <CardContent className="grid gap-2 pt-6 text-sm sm:grid-cols-2">
          {v.registeredName && <p><span className="text-muted-foreground">Registered:</span> {v.registeredName}</p>}
          <p><span className="text-muted-foreground">Category:</span> {v.productCategory ?? v.category ?? "—"}</p>
          <p><span className="text-muted-foreground">Contact:</span> {v.user.phone ?? v.user.email ?? "—"}</p>
          {v.contactPerson && <p><span className="text-muted-foreground">Person:</span> {v.contactPerson}{v.whatsapp ? ` · ${v.whatsapp}` : ""}</p>}
          {v.city && <p><span className="text-muted-foreground">City:</span> {v.city}</p>}
          <p><span className="text-muted-foreground">Links:</span> {v.website || "—"}{(v.instagram || socials?.instagram) ? ` · ${v.instagram ?? socials?.instagram}` : ""}</p>
          {v.products && <p className="sm:col-span-2"><span className="text-muted-foreground">Sells:</span> {v.products}</p>}
          {v.description && <p className="sm:col-span-2 text-muted-foreground">{v.description}</p>}
          <p className="sm:col-span-2"><span className="text-muted-foreground">KYC numbers:</span>{" "}
            {v.kyc ? `PAN ${v.kyc.pan ?? "—"} · FSSAI ${v.kyc.fssai ?? "—"} · GSTIN ${v.kyc.gstin ?? "—"}` : "not submitted"}
          </p>
          <p className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">KYC documents:</span>
            {kycDocs.length === 0 && <span className="text-muted-foreground">none uploaded</span>}
            {kycDocs.map(([k, label]) => (
              <a key={k} href={docUrls[k]!.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{label}</a>
            ))}
          </p>
          <p className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Agreement:</span>
            <Badge variant={signed ? "success" : "warning"}>{signed ? "Signed" : "Not signed"}</Badge>
            {signed && v.contract?.signerName && <span className="text-muted-foreground">by {v.contract.signerName}</span>}
            {signed && v.contract?.url && (
              <a href={v.contract.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Download PDF</a>
            )}
          </p>
          {v.callbackAt && (
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Last call-back: {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(v.callbackAt)}
              {v.callbackNote ? ` — "${v.callbackNote}"` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {v.assets.length > 0 && (
        <section className="flex flex-wrap gap-3">
          {v.assets.map((a) => (
            <Image key={a.id} src={a.url} alt="" width={80} height={80} className="size-20 rounded-lg border border-border object-cover" />
          ))}
        </section>
      )}

      {v.bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assigned stalls</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            {v.bookings.map((b) => (
              <p key={b.id} className="text-muted-foreground">{b.event.name} · {b.stall.label} · {b.status}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {!decided && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Make a decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Verification call-back log */}
            <form action={logCallbackAction} className="space-y-2">
              <input type="hidden" name="id" value={v.id} />
              <Field label="Verification call-back note">
                <textarea
                  name="note"
                  rows={2}
                  placeholder="What did the call cover? (recorded with a timestamp)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>
              <Button type="submit" variant="outline" size="sm">Log call-back</Button>
            </form>

            {/* Approve-before-pay: confirm the vendor's reserved stall + open payment */}
            {reserved && (
              <form action={approveForPaymentAction} className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <input type="hidden" name="id" value={v.id} />
                <span className="text-sm">
                  Reserved <strong>stall {reserved.stall.label}</strong> · {reserved.event.name}
                </span>
                <Button type="submit" disabled={!signed} title={signed ? "" : "Vendor must sign the agreement first"}>
                  Approve &amp; open for payment
                </Button>
                {!signed && <span className="text-xs text-muted-foreground">Awaiting signed agreement</span>}
              </form>
            )}

            <form action={approveAction} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <input type="hidden" name="id" value={v.id} />
              <Field label="Assign a stall" className="min-w-56 flex-1">
                <Select name="stallId" required>
                  <option value="">Choose a stall…</option>
                  {stalls.map((s) => (
                    <option key={s.id} value={s.id}>{s.event.name} · {s.label} ({s.status})</option>
                  ))}
                </Select>
              </Field>
              <Button type="submit">Approve &amp; assign</Button>
            </form>

            <form action={rejectAction}>
              <input type="hidden" name="id" value={v.id} />
              <Button type="submit" variant="ghost" size="sm">Decline application</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {v.approvalStatus === "APPROVED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign a stall</CardTitle>
          </CardHeader>
          <CardContent>
            {stalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stalls available yet — build the event layout first under Events → Event layout.
              </p>
            ) : (
              <form action={assignStallAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={v.id} />
                <Field label="Stall" className="min-w-56 flex-1">
                  <Select name="stallId" required>
                    <option value="">Choose a stall…</option>
                    {stalls.map((s) => (
                      <option key={s.id} value={s.id}>{s.event.name} · {s.label} ({s.status})</option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit">Assign stall</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
