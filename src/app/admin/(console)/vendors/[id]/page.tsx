import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { fmtDateTime } from "@/lib/date-formats";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/guard";
import { getVendor, listAssignableStalls } from "@/server/vendors/admin-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPaise } from "@/lib/utils";
import { approveForPaymentAction, assignStallAction, logCallbackAction, recordOfflinePaymentAction, rejectAction, setKycDocStatusAction } from "./actions";

export const metadata: Metadata = { title: "Vendor" };

const STATUS: Record<string, { label: string; variant: "primary" | "warning" | "success" | "danger" }> = {
  SUBMITTED: { label: "New", variant: "primary" },
  UNDER_REVIEW: { label: "Reviewing", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Declined", variant: "danger" },
};

function stallAmount(stall: { priceInPaise: number | null; stallType: { priceInPaise: number } | null }) {
  return stall.priceInPaise ?? stall.stallType?.priceInPaise ?? 0;
}

export default async function AdminVendorDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("VENDOR_VIEW");
  const { id } = await params;
  const v = await getVendor(id);
  if (!v) notFound();
  const stalls = await listAssignableStalls();
  const socials = (v.socials as { instagram?: string } | null) ?? null;
  const decided = v.approvalStatus === "APPROVED" || v.approvalStatus === "REJECTED";
  const status = STATUS[v.approvalStatus];
  const KYC_DOC_LABELS: Record<string, string> = { pan: "PAN card", fssai: "FSSAI", gst: "GST cert", id: "Photo ID" };
  const DOC_STATUS: Record<string, { label: string; variant: "warning" | "success" | "danger" }> = {
    PENDING: { label: "In review", variant: "warning" },
    VERIFIED: { label: "Verified", variant: "success" },
    REJECTED: { label: "Rejected", variant: "danger" },
  };
  const kycDocs = v.docs.filter((d) => KYC_DOC_LABELS[d.docType]);
  const reserved = v.bookings.find((b) => b.status === "RESERVED");
  const pendingPayments = v.bookings.filter((b) => b.status === "PENDING_PAYMENT");
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
          <div className="sm:col-span-2 space-y-1.5">
            <span className="text-muted-foreground">KYC documents:</span>
            {kycDocs.length === 0 && <span className="ml-2 text-muted-foreground">none uploaded</span>}
            {kycDocs.map((d) => {
              const st = DOC_STATUS[d.status] ?? DOC_STATUS.PENDING;
              return (
                <div key={d.docType} className="flex flex-wrap items-center gap-2">
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {KYC_DOC_LABELS[d.docType]}
                  </a>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  {d.status !== "VERIFIED" && (
                    <ActionForm action={setKycDocStatusAction} success="Document verified" className="inline">
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="docType" value={d.docType} />
                      <input type="hidden" name="status" value="VERIFIED" />
                      <Button type="submit" variant="outline" size="sm">Verify</Button>
                    </ActionForm>
                  )}
                  {d.status !== "REJECTED" && (
                    <ActionForm action={setKycDocStatusAction} success="Document rejected — vendor asked to re-upload" className="inline">
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="docType" value={d.docType} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <Button type="submit" variant="ghost" size="sm">Reject</Button>
                    </ActionForm>
                  )}
                </div>
              );
            })}
          </div>
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
              Last call-back: {fmtDateTime(v.callbackAt)}
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
          <CardContent className="space-y-1.5 pt-0 text-sm">
            {v.bookings.map((b) => {
              const agreementSigned = b.agreement?.status === "SIGNED";
              return (
                <p key={b.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  {b.event.name} · {b.stall.label} · {b.status}
                  <Badge variant={agreementSigned ? "success" : "warning"}>
                    {agreementSigned ? "Event agreement signed" : "Event agreement pending"}
                  </Badge>
                  {agreementSigned && b.agreement?.signedAt && (
                    <span className="text-xs">
                      {b.agreement.signerName ? `by ${b.agreement.signerName} · ` : ""}{fmtDateTime(b.agreement.signedAt)}
                    </span>
                  )}
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record offline stall payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments.map((b) => {
              const amountPaise = stallAmount(b.stall);
              return (
                <ActionForm key={b.id} action={recordOfflinePaymentAction} success="Offline payment recorded" className="grid gap-3 border-b border-border pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="bookingId" value={b.id} />
                  <input type="hidden" name="amountPaise" value={amountPaise} />
                  <div className="md:col-span-3 text-sm text-muted-foreground">
                    {b.event.name} · stall {b.stall.label} · {formatPaise(amountPaise)}
                  </div>
                  <Field label="Payment reference">
                    <Input name="gatewayRef" placeholder="Cash receipt or UPI UTR" required />
                  </Field>
                  <Field label="Payment note">
                    <Input name="note" placeholder="Who received it and where" required />
                  </Field>
                  <Button type="submit" disabled={amountPaise <= 0}>Mark paid</Button>
                </ActionForm>
              );
            })}
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
            <ActionForm action={logCallbackAction} success="Call-back logged" className="space-y-2">
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
            </ActionForm>

            {/* Approve-before-pay: confirm the vendor's reserved stall + open payment */}
            {reserved && (
              <ActionForm action={approveForPaymentAction} success="Approved — payment is now open to the vendor" className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <input type="hidden" name="id" value={v.id} />
                <span className="text-sm">
                  Reserved <strong>stall {reserved.stall.label}</strong> · {reserved.event.name}
                </span>
                <Button type="submit" disabled={!signed} title={signed ? "" : "Vendor must sign the agreement first"}>
                  Approve &amp; open for payment
                </Button>
                {!signed && <span className="text-xs text-muted-foreground">Awaiting signed agreement</span>}
              </ActionForm>
            )}

            <ActionForm action={rejectAction} success="Application declined">
              <input type="hidden" name="id" value={v.id} />
              <Button type="submit" variant="ghost" size="sm">Decline application</Button>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      {v.approvalStatus === "APPROVED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign a stall for payment</CardTitle>
          </CardHeader>
          <CardContent>
            {stalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stalls available yet — build the event layout first under Events → Event layout.
              </p>
            ) : (
              <ActionForm action={assignStallAction} success="Stall assigned for payment" className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={v.id} />
                <Field label="Stall" className="min-w-56 flex-1">
                  <Select name="stallId" required>
                    <option value="">Choose a stall…</option>
                    {stalls.map((s) => (
                      <option key={s.id} value={s.id}>{s.event.name} · {s.label} ({s.status})</option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit">Assign for payment</Button>
              </ActionForm>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
