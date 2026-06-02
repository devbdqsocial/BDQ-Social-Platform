import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/guard";
import { getVendor, listAssignableStalls } from "@/server/vendors/admin-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { approveAction, assignStallAction, rejectAction, underReviewAction } from "./actions";

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

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold">{v.brandName}</h1>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>
        <Link href="/admin/vendors" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">← All vendors</Link>
      </div>

      <Card>
        <CardContent className="grid gap-2 pt-6 text-sm">
          <p><span className="text-muted-foreground">Sells:</span> {v.category ?? "—"}</p>
          <p><span className="text-muted-foreground">Contact:</span> {v.user.phone ?? v.user.email ?? "—"}</p>
          {v.description && <p className="text-muted-foreground">{v.description}</p>}
          <p>
            <span className="text-muted-foreground">Links:</span> {v.website || "—"}
            {socials?.instagram ? ` · ${socials.instagram}` : ""}
          </p>
          <p>
            <span className="text-muted-foreground">Documents:</span>{" "}
            {v.kyc ? `PAN ${v.kyc.pan ?? "—"} · FSSAI ${v.kyc.fssai ?? "—"} · GSTIN ${v.kyc.gstin ?? "—"}` : "not submitted"}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Contract:</span>
            <Badge variant={v.contract?.status === "SIGNED" ? "success" : "warning"}>
              {v.contract?.status === "SIGNED" ? "Signed" : "Not signed"}
            </Badge>
          </p>
        </CardContent>
      </Card>

      {v.assets.length > 0 && (
        <section className="flex flex-wrap gap-3">
          {v.assets.map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={a.id} src={a.url} alt="" className="size-20 rounded-lg border border-border object-cover" />
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
          <CardContent className="space-y-4">
            {v.approvalStatus === "SUBMITTED" && (
              <form action={underReviewAction}>
                <input type="hidden" name="id" value={v.id} />
                <Button type="submit" variant="outline" size="sm">Start verification call</Button>
              </form>
            )}

            <form action={approveAction} className="flex flex-wrap items-end gap-3">
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
