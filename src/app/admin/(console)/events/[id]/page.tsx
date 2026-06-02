import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getByIdForAdmin } from "@/server/events/service";
import { formatPaise } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { publishEventAction } from "../actions";
import { addTicketTypeAction, deleteTicketTypeAction, addScheduleItemAction, deleteScheduleItemAction, setEventThemeAction } from "./actions";

export const metadata: Metadata = { title: "Edit event" };

const isLive = (s: string) => s === "PUBLISHED" || s === "LIVE";
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function AdminEventEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const event = await getByIdForAdmin(id);
  if (!event) notFound();
  const theme = (event.theme as { primary?: string; accent?: string } | null) ?? null;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <span className="truncate">{event.name}</span>
            <Badge variant={isLive(event.status) ? "success" : "neutral"}>{isLive(event.status) ? "Live" : "Draft"}</Badge>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/admin/events/${event.id}/map`}>Edit floor plan</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/events/${event.slug}`}>View public page</Link></Button>
          {!isLive(event.status) && (
            <form action={publishEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <Button type="submit" size="sm">Publish</Button>
            </form>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold">Tickets ({event.ticketTypes.length})</h2>
        {event.ticketTypes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No tickets yet — add your first one below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {event.ticketTypes.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{t.name} · {formatPaise(t.priceInPaise)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.soldQty}/{t.totalQty} sold · admits {t.attendeesPer}
                    {t.earlyPricePaise != null ? ` · early bird ${formatPaise(t.earlyPricePaise)}` : ""}
                  </p>
                </div>
                <form action={deleteTicketTypeAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" variant="ghost" size="sm">Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <Card asChild className="mt-4">
          <form action={addTicketTypeAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <CardHeader>
              <CardTitle className="text-base">Add a ticket</CardTitle>
              <CardDescription>Set the price shoppers pay and how many are available.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Ticket name" className="sm:col-span-2">
                <Input name="name" required placeholder="General, Couple, VIP…" />
              </Field>
              <Field label="Price (₹)">
                <Input type="number" name="priceRupees" min={0} required placeholder="499" />
              </Field>
              <Field label="Early-bird price (₹)" hint="Optional">
                <Input type="number" name="earlyRupees" min={0} />
              </Field>
              <Field label="How many available">
                <Input type="number" name="totalQty" min={1} required placeholder="2000" />
              </Field>
              <Field label="People admitted per ticket" hint="1 for solo, 2 for a couple pass.">
                <Input type="number" name="attendeesPer" min={1} defaultValue={1} />
              </Field>
              <Button type="submit" className="w-fit sm:col-span-2">Add ticket</Button>
            </CardContent>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Schedule ({event.schedule.length})</h2>
        {event.schedule.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No schedule yet — add what&apos;s happening below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {event.schedule.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtTime(s.startsAt)}
                    {s.stageOrZone ? ` · ${s.stageOrZone}` : ""}
                    {s.performer ? ` · ${s.performer}` : ""}
                  </p>
                </div>
                <form action={deleteScheduleItemAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" variant="ghost" size="sm">Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <Card asChild className="mt-4">
          <form action={addScheduleItemAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <CardHeader>
              <CardTitle className="text-base">Add to the schedule</CardTitle>
              <CardDescription>Sets, performances, and zone openings — shown on the event page.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="What's happening" className="sm:col-span-2">
                <Input name="title" required placeholder="Headline set, food court opens…" />
              </Field>
              <Field label="Starts">
                <Input type="datetime-local" name="startsAt" required />
              </Field>
              <Field label="Ends" hint="Optional">
                <Input type="datetime-local" name="endsAt" />
              </Field>
              <Field label="Stage / zone" hint="Optional">
                <Input name="stageOrZone" placeholder="Main Stage" />
              </Field>
              <Field label="Performer" hint="Optional">
                <Input name="performer" />
              </Field>
              <Button type="submit" className="w-fit sm:col-span-2">Add to schedule</Button>
            </CardContent>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Theme</h2>
        <Card asChild className="mt-3">
          <form action={setEventThemeAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <CardHeader>
              <CardTitle className="text-base">Event colours</CardTitle>
              <CardDescription>White-label this event&apos;s public page. Leave blank to use the BDQ brand.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary colour" hint="Buttons + accents. Hex like #C2603B.">
                <Input name="primary" defaultValue={theme?.primary ?? ""} placeholder="#C2603B" />
              </Field>
              <Field label="Accent colour" hint="Highlights. Hex like #D69A22.">
                <Input name="accent" defaultValue={theme?.accent ?? ""} placeholder="#D69A22" />
              </Field>
              <Button type="submit" className="w-fit sm:col-span-2">Save theme</Button>
            </CardContent>
          </form>
        </Card>
      </section>
    </div>
  );
}
