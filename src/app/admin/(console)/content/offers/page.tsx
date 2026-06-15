import type { Metadata } from "next";
import { fmtDateTime } from "@/lib/date-formats";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listOffersForAdmin } from "@/server/content/admin-offers";
import { listApprovedVendors } from "@/server/vendors/service";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createOfferAction, updateOfferAction, publishOfferAction, endOfferAction, deleteOfferAction } from "./actions";

export const metadata: Metadata = { title: "Offers" };

const KINDS = ["DISCOUNT", "FREEBIE", "BUNDLE"] as const;
const STATUS_VARIANT = { DRAFT: "warning", PUBLISHED: "success", ENDED: "neutral" } as const;

export default async function AdminOffersPage() {
  await requireAdminRole();
  const { active } = await getActiveEvent();
  if (!active) {
    return (
      <div className="space-y-4">
        <PageHeader title="Offers" description="Pick or create an event to manage its offers." />
        <p className="text-sm text-muted-foreground">No active event. Choose one from the event switcher.</p>
      </div>
    );
  }

  const [offers, vendors, sponsors] = await Promise.all([
    listOffersForAdmin(active.id),
    listApprovedVendors(),
    db.sponsor.findMany({ where: { eventId: active.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const linkOptions = (
    <>
      <option value="">Select a vendor or sponsor…</option>
      {vendors.length > 0 && (
        <optgroup label="Vendors (approved)">
          {vendors.map((v) => <option key={v.id} value={`v:${v.id}`}>{v.brandName}</option>)}
        </optgroup>
      )}
      {sponsors.length > 0 && (
        <optgroup label="Sponsors">
          {sponsors.map((s) => <option key={s.id} value={`s:${s.id}`}>{s.name}</option>)}
        </optgroup>
      )}
    </>
  );

  const published = offers.filter((o) => o.status === "PUBLISHED").length;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Offers" description={`Deals from vendors & sponsors for ${active.name}. The customer Offers wall appears once one is published.`} />
      {published === 0 && offers.length > 0 && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          No offers are published yet — the customer Offers wall stays hidden until at least one is live.
        </p>
      )}

      {/* Existing offers — each row is its own edit form + lifecycle actions */}
      {offers.map((o) => {
        const current = o.vendorProfileId ? `v:${o.vendorProfileId}` : o.sponsorId ? `s:${o.sponsorId}` : "";
        return (
          <Card key={o.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{o.title}</CardTitle>
                <Badge variant={STATUS_VARIANT[o.status as keyof typeof STATUS_VARIANT] ?? "neutral"}>{o.status}</Badge>
              </div>
              <CardDescription>
                {o.vendorProfile?.brandName ?? o.sponsor?.name ?? "—"} · redeemed {o.redeemedCount}{o.maxRedemptions ? `/${o.maxRedemptions}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={updateOfferAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="eventId" value={active.id} />
                <Field label="Linked to" className="sm:col-span-2"><Select name="link" defaultValue={current}>{linkOptions}</Select></Field>
                <Field label="Title" className="sm:col-span-2"><Input name="title" required maxLength={60} defaultValue={o.title} /></Field>
                <Field label="Terms" className="sm:col-span-2"><Textarea name="terms" required maxLength={200} rows={2} defaultValue={o.terms} /></Field>
                <Field label="Kind"><Select name="kind" defaultValue={o.kind}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
                <Field label="Max redemptions" hint="Blank = unlimited"><Input type="number" name="maxRedemptions" min={1} defaultValue={o.maxRedemptions ?? ""} /></Field>
                <Field label="Starts"><DateTimePicker name="startsAt" required defaultValue={o.startsAt} /></Field>
                <Field label="Ends"><DateTimePicker name="endsAt" required defaultValue={o.endsAt} /></Field>
                <Button type="submit" size="sm" className="w-fit sm:col-span-2">Save changes</Button>
              </form>
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {o.status !== "PUBLISHED" && (
                  <form action={publishOfferAction}><input type="hidden" name="id" value={o.id} /><Button type="submit" size="sm">Publish</Button></form>
                )}
                {o.status === "PUBLISHED" && (
                  <form action={endOfferAction}><input type="hidden" name="id" value={o.id} /><Button type="submit" size="sm" variant="outline">End now</Button></form>
                )}
                <form action={deleteOfferAction}><input type="hidden" name="id" value={o.id} /><Button type="submit" size="sm" variant="ghost">Delete</Button></form>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* New offer (defaults to the event window) */}
      <Card asChild>
        <form action={createOfferAction}>
          <input type="hidden" name="eventId" value={active.id} />
          <CardHeader>
            <CardTitle className="text-base">Add an offer</CardTitle>
            <CardDescription>Link it to an approved vendor or a sponsor. It starts as a draft — publish when ready.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Linked to" className="sm:col-span-2"><Select name="link" defaultValue="">{linkOptions}</Select></Field>
            <Field label="Title" className="sm:col-span-2"><Input name="title" required maxLength={60} placeholder="20% off all mains" /></Field>
            <Field label="Terms" className="sm:col-span-2"><Textarea name="terms" required maxLength={200} rows={2} placeholder="Show this at the stall. One per guest." /></Field>
            <Field label="Kind"><Select name="kind" defaultValue="DISCOUNT">{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
            <Field label="Max redemptions" hint="Blank = unlimited"><Input type="number" name="maxRedemptions" min={1} /></Field>
            <Field label="Starts"><DateTimePicker name="startsAt" required defaultValue={active.startsAt} /></Field>
            <Field label="Ends"><DateTimePicker name="endsAt" required defaultValue={active.endsAt} /></Field>
            <Button type="submit" className="w-fit sm:col-span-2">Add offer</Button>
          </CardContent>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground">Published offers auto-end at their end time (cron). Window must sit inside {fmtDateTime(active.startsAt)} → {fmtDateTime(active.endsAt)}.</p>
    </div>
  );
}
