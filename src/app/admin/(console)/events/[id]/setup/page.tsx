import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDateTime } from "@/lib/date-formats";
import { ArrowRight } from "lucide-react";
import { requireAdminRole } from "@/server/auth/guard";
import { getByIdForAdmin } from "@/server/events/service";
import { listMaps } from "@/server/map/maps";
import { formatPaise } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WizardSteps, type WizardStep } from "@/components/admin/WizardSteps";
import { PublishButton } from "@/components/admin/PublishButton";
import { MapAttach } from "../MapAttach";
import { addTicketTypeAction, deleteTicketTypeAction } from "../actions";

export const metadata: Metadata = { title: "Set up event" };

const STEPS: WizardStep[] = ["tickets", "map", "review"];

export default async function EventSetupWizard({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  await requireAdminRole();
  const { id } = await params;
  const { step: requested } = await searchParams;
  const step: WizardStep = STEPS.includes(requested as WizardStep) ? (requested as WizardStep) : "tickets";

  const event = await getByIdForAdmin(id);
  if (!event) notFound();

  const maps = (await listMaps()).map((m) => ({ id: m.id, name: m.name }));
  const mapStatus = event.mapId ? "Map attached" : event.mapLayout ? "Custom layout" : "Not set";

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={`Set up · ${event.name}`} description="Keep going — your draft is saved at each step." />
      <WizardSteps current={step} eventId={id} />

      {step === "tickets" && (
        <div className="space-y-4">
          {event.ticketTypes.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {event.ticketTypes.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <p className="text-sm font-medium">{t.name} · {formatPaise(t.priceInPaise)} · {t.totalQty} available</p>
                  <form action={deleteTicketTypeAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <Button type="submit" variant="ghost" size="sm">Remove</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <Card asChild>
            <form action={addTicketTypeAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Add a ticket type</CardTitle>
                <CardDescription>Set the price shoppers pay and how many are available. Add as many types as you need.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Ticket name" className="sm:col-span-2"><Input name="name" required placeholder="General, Couple, VIP…" /></Field>
                <Field label="Price (₹)"><Input type="number" name="priceRupees" min={0} required placeholder="499" /></Field>
                <Field label="Early-bird price (₹)" hint="Optional"><Input type="number" name="earlyRupees" min={0} /></Field>
                <Field label="How many available"><Input type="number" name="totalQty" min={1} required placeholder="2000" /></Field>
                <Field label="People admitted per ticket" hint="1 for solo, 2 for a couple pass."><Input type="number" name="attendeesPer" min={1} defaultValue={1} /></Field>
                <Button type="submit" className="w-fit sm:col-span-2">Add ticket</Button>
              </CardContent>
            </form>
          </Card>
          <div className="flex justify-end">
            <Button asChild><Link href={`/admin/events/${id}/setup?step=map`}>Continue to map <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      )}

      {step === "map" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event layout</CardTitle>
              <CardDescription>Attach a reusable venue map (copies its stalls), or skip and build it later.</CardDescription>
            </CardHeader>
            <CardContent>
              <MapAttach eventId={id} maps={maps} currentMapId={event.mapId} />
            </CardContent>
          </Card>
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost"><Link href={`/admin/events/${id}/setup?step=tickets`}>← Back</Link></Button>
            <Button asChild><Link href={`/admin/events/${id}/setup?step=review`}>Continue to review <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review &amp; publish</CardTitle>
              <CardDescription>Publishing makes the event live and revalidates the public pages. You can keep editing afterwards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Name" value={event.name} />
              <Row label="When" value={`${fmtDateTime(event.startsAt)} → ${fmtDateTime(event.endsAt)}`} />
              <Row label="Location" value={event.location ?? "—"} />
              <Row label="Ticket types" value={event.ticketTypes.length ? `${event.ticketTypes.length} (from ${formatPaise(Math.min(...event.ticketTypes.map((t) => t.priceInPaise)))})` : "None yet"} />
              <Row label="Layout" value={mapStatus} />
              <Row label="Status" value={event.status} />
            </CardContent>
          </Card>
          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="ghost"><Link href={`/admin/events/${id}/setup?step=map`}>← Back</Link></Button>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline"><Link href={`/admin/events/${id}`}>Save as draft</Link></Button>
              <PublishButton eventId={id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
