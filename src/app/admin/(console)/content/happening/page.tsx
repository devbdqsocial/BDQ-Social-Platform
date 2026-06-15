import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listHappeningForAdmin } from "@/server/content/happening";
import { KIND_LABEL } from "@/lib/happening";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createHappeningAction, updateHappeningAction, publishHappeningAction, archiveHappeningAction } from "./actions";

export const metadata: Metadata = { title: "Happening strip" };

const MANUAL_KINDS = ["ANNOUNCEMENT", "SPONSOR", "ACTIVITY", "WORKSHOP", "PERFORMANCE", "FACILITY", "LIVE_NOW", "STARTING_SOON", "OFFER"];

function kindOptions() {
  return MANUAL_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k] ?? k}{["LIVE_NOW", "STARTING_SOON", "OFFER"].includes(k) ? " (auto-sourced)" : ""}</option>);
}

export default async function AdminHappeningPage() {
  await requireAdminRole();
  const { active } = await getActiveEvent();
  if (!active) {
    return (
      <div className="space-y-4">
        <PageHeader title="Happening strip" description="Pick or create an event to manage its live strip." />
        <p className="text-sm text-muted-foreground">No active event. Choose one from the event switcher.</p>
      </div>
    );
  }

  const items = await listHappeningForAdmin(active.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Happening strip" description={`The live heartbeat for ${active.name}.`} />
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <strong>Live now</strong>, <strong>Starting soon</strong> and <strong>Offers</strong> appear on the strip
        automatically from your schedule + published offers — no need to add them here. Use this for announcements,
        sponsor shout-outs, activities, and facilities. Items show only inside their time window (auto-hide).
      </p>

      {items.map((it) => (
        <Card key={it.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{it.emoji ? `${it.emoji} ` : ""}{it.title}</CardTitle>
              <Badge variant={it.published ? "success" : "warning"}>{it.published ? "Live" : "Draft"}</Badge>
            </div>
            <CardDescription>{KIND_LABEL[it.kind] ?? it.kind}{it.priority ? ` · weight ${it.priority}` : ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={updateHappeningAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={it.id} />
              <input type="hidden" name="eventId" value={active.id} />
              <Field label="Kind"><Select name="kind" defaultValue={it.kind}>{kindOptions()}</Select></Field>
              <Field label="Emoji" hint="Optional"><Input name="emoji" maxLength={8} defaultValue={it.emoji ?? ""} /></Field>
              <Field label="Title" className="sm:col-span-2"><Input name="title" required maxLength={80} defaultValue={it.title} /></Field>
              <Field label="Detail" className="sm:col-span-2"><Input name="detail" maxLength={120} defaultValue={it.detail ?? ""} /></Field>
              <Field label="Link" hint="Optional (e.g. /map, /offers)"><Input name="href" maxLength={200} defaultValue={it.href ?? ""} /></Field>
              <Field label="Weight" hint="Higher shows first"><Input type="number" name="priority" min={0} max={100} defaultValue={it.priority} /></Field>
              <Field label="Show from" hint="Optional"><DateTimePicker name="startsAt" defaultValue={it.startsAt ?? undefined} /></Field>
              <Field label="Hide after" hint="Optional — auto-expire"><DateTimePicker name="endsAt" defaultValue={it.endsAt ?? undefined} /></Field>
              <Button type="submit" size="sm" className="w-fit sm:col-span-2">Save</Button>
            </form>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <form action={publishHappeningAction}>
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="published" value={(!it.published).toString()} />
                <Button type="submit" size="sm" variant={it.published ? "outline" : "default"}>{it.published ? "Unpublish" : "Publish"}</Button>
              </form>
              <form action={archiveHappeningAction}>
                <input type="hidden" name="id" value={it.id} />
                <Button type="submit" size="sm" variant="ghost">Archive</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card asChild>
        <form action={createHappeningAction}>
          <input type="hidden" name="eventId" value={active.id} />
          <CardHeader>
            <CardTitle className="text-base">Add to the strip</CardTitle>
            <CardDescription>Keep it short and glanceable (≤80 chars). Publish when you want it live.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind"><Select name="kind" defaultValue="ANNOUNCEMENT">{kindOptions()}</Select></Field>
            <Field label="Emoji" hint="Optional"><Input name="emoji" maxLength={8} placeholder="🚗" /></Field>
            <Field label="Title" className="sm:col-span-2"><Input name="title" required maxLength={80} placeholder="Parking B almost full — use Gate 2" /></Field>
            <Field label="Detail" className="sm:col-span-2"><Input name="detail" maxLength={120} placeholder="Optional sub-line" /></Field>
            <Field label="Link" hint="Optional"><Input name="href" maxLength={200} placeholder="/map" /></Field>
            <Field label="Weight" hint="Higher shows first"><Input type="number" name="priority" min={0} max={100} defaultValue={0} /></Field>
            <Field label="Show from" hint="Optional"><DateTimePicker name="startsAt" /></Field>
            <Field label="Hide after" hint="Optional — auto-expire"><DateTimePicker name="endsAt" /></Field>
            <Button type="submit" className="w-fit sm:col-span-2">Add item</Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
