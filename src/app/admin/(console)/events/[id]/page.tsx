import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { getByIdForAdmin, getEventReadiness } from "@/server/events/service";
import { deriveSetupSteps } from "@/server/events/setup-steps";
import { listMaps } from "@/server/map/maps";
import { formatPaise } from "@/lib/utils";
import { MapAttach, type MapSummary } from "./MapAttach";
import { upgradeLayout } from "@/lib/map/layout-v2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { listEventLineup } from "@/server/artists/bookings-service";
import { listArtists } from "@/server/artists/admin-service";
import { BookingPanel } from "@/components/admin/BookingPanel";
import { EventRunOfShow } from "@/components/admin/EventRunOfShow";
import { EventSetupChecklist } from "@/components/admin/EventSetupChecklist";
import { EventDetailsFields } from "@/components/admin/EventDetailsFields";
import { SavingForm } from "@/components/admin/SavingForm";
import { ThemeColorField } from "@/components/admin/ThemeColorField";
import { createBookingAction } from "../../artists/booking-actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { publishEventAction } from "../actions";
import { ActionForm } from "@/components/admin/action-form";
import { addTicketTypeAction, deleteTicketTypeAction, addScheduleItemAction, setEventThemeAction, setPricingRulesAction, setEventLogisticsAction, setVendorStallsAction, updateEventAction, addEventDayAction, updateEventDayAction } from "./actions";
import { DeleteEventButton } from "./DeleteEventButton";
import { DeleteDayButton } from "./DeleteDayButton";

export const metadata: Metadata = { title: "Edit event" };

const isLive = (s: string) => s === "PUBLISHED" || s === "LIVE";
const dayLabelDate = (d: Date) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function AdminEventEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminRole();
  const { id } = await params;
  const { tab: requestedTab } = await searchParams;
  const [event, maps, lineup, roster, readiness] = await Promise.all([getByIdForAdmin(id), listMaps(), listEventLineup(id), listArtists(), getEventReadiness(id)]);
  if (!event) notFound();
  const theme = (event.theme as { primary?: string; accent?: string } | null) ?? null;
  const earlyBird = (event.earlyBird as { active?: boolean; percent?: number } | null) ?? null;
  const bulkTiers = ((event.bulkTiers as { minQty: number; percent: number }[] | null) ?? [])
    .slice()
    .sort((a, b) => a.minQty - b.minQty);
  const sections = [
    ["overview", "Overview"],
    ["details", "Details"],
    ["tickets", `Tickets (${event.ticketTypes.length})`],
    ["schedule", `Schedule (${event.schedule.length})`],
    ["lineup", `Lineup (${lineup.length})`],
    ["stalls", "Stalls"],
    ["settings", "Settings"],
    ["danger", "Danger"],
  ] as const;
  // Old bookmarks / deep links from the pre-merge tab set still land somewhere sensible.
  const TAB_ALIASES: Record<string, string> = { pricing: "tickets", map: "stalls", theme: "settings", logistics: "settings" };
  const requested = requestedTab ? (TAB_ALIASES[requestedTab] ?? requestedTab) : undefined;
  const initialTab = sections.some(([value]) => value === requested) ? (requested as (typeof sections)[number][0]) : "overview";

  const steps = deriveSetupSteps({
    eventId: event.id,
    vendorStallsEnabled: event.vendorStallsEnabled,
    issues: readiness.issues,
    counts: { days: event.days.length, scheduleItems: event.schedule.length, lineup: lineup.length, addOns: event._count.addOns },
    hasPricingRules: !!earlyBird?.active || bulkTiers.length > 0,
    hasTheme: !!(theme?.primary || theme?.accent),
    hasLogistics: event.addOnCloseHours != null || event.loadInStartsAt != null,
  });
  const requiredSteps = steps.filter((s) => s.group !== "optional");
  const nextStep = requiredSteps.find((s) => !s.done) ?? steps.find((s) => !s.done);
  const effectivePrice = (s: { priceInPaise: number | null; stallType: { priceInPaise: number } | null }) => s.priceInPaise ?? s.stallType?.priceInPaise ?? 0;
  const stallStats = {
    total: event.stalls.length,
    priced: event.stalls.filter((s) => effectivePrice(s) > 0).length,
    booked: event.stalls.filter((s) => s.status === "BOOKED").length,
    held: event.stalls.filter((s) => s.status === "HELD" || s.status === "PENDING").length,
  };
  const ticketsSold = event.ticketTypes.reduce((n, t) => n + t.soldQty, 0);

  // Attach-dialog summaries: what each library map would do to THIS event (type matches by name,
  // booked stalls whose labels the incoming map lacks — those keep their spots and may overlap).
  const eventTypeNames = new Set(event.stallTypes.map((t) => t.name.trim().toLowerCase()));
  const activeStallLabels = event.stalls.filter((s) => s.status === "BOOKED" || s.status === "HELD" || s.status === "PENDING").map((s) => s.label);
  const mapSummaries: MapSummary[] = maps.map((m) => {
    const stallEls = upgradeLayout(m.layoutJson).elements.filter((e) => e.kind === "stall");
    const labels = new Set(stallEls.map((e) => e.label.trim()));
    return {
      id: m.id,
      name: m.name,
      stallCount: stallEls.length,
      matchedTypeCount: stallEls.filter((e) => eventTypeNames.has(e.type.trim().toLowerCase())).length,
      missingActiveLabels: activeStallLabels.filter((l) => !labels.has(l.trim())),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <span className="truncate">{event.name}</span>
            <Badge variant={isLive(event.status) ? "success" : "neutral"}>{isLive(event.status) ? "Live" : "Draft"}</Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Public page:{" "}
            <Link href={`/events/${event.slug}`} className="font-medium text-primary hover:underline">/events/{event.slug}</Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.status === "DRAFT" && (
            <Link
              href="?tab=overview"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 text-xs font-medium hover:bg-muted"
            >
              {readiness.ready
                ? "Setup complete — ready to publish"
                : `Setup ${requiredSteps.filter((s) => s.done).length}/${requiredSteps.length}${nextStep ? ` · Next: ${nextStep.label}` : ""}`}
            </Link>
          )}
          <Button asChild variant="ghost" size="sm"><Link href={`/events/${event.slug}`}>View public page</Link></Button>
          {!isLive(event.status) && (
            <ActionForm action={publishEventAction} success="Event published">
              <input type="hidden" name="id" value={event.id} />
              <Button type="submit" size="sm" disabled={!readiness.ready}>Publish</Button>
            </ActionForm>
          )}
        </div>
      </div>

      <Tabs key={initialTab} defaultValue={initialTab} className="min-w-0 gap-4">
        <TabsList className="!flex !h-auto w-full flex-wrap justify-start gap-2 rounded-xl border border-border bg-muted/40 p-2">
          {sections.map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-10 whitespace-nowrap rounded-lg px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW — setup progress + key stats + quick links */}
        <TabsContent value="overview" className="space-y-6">
          <EventSetupChecklist eventId={event.id} status={event.status} steps={steps} readiness={readiness} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Ticket types", value: String(event.ticketTypes.length), sub: `${ticketsSold} sold` },
              { label: "Orders", value: String(event._count.orders) },
              { label: "Event days", value: event.days.length > 0 ? String(event.days.length) : "—", sub: `${event.schedule.length} schedule items` },
              ...(event.vendorStallsEnabled ? [{ label: "Stalls booked", value: `${stallStats.booked}/${stallStats.total}`, sub: stallStats.held > 0 ? `${stallStats.held} held/pending` : undefined }] : []),
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                {stat.sub && <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href={`/events/${event.slug}`}>View public page</Link></Button>
            {event.vendorStallsEnabled && (
              <>
                <Button asChild variant="outline" size="sm"><Link href={`/admin/events/${event.id}/map`}>Open map designer</Link></Button>
                <Button asChild variant="outline" size="sm"><Link href={`/admin/events/${event.id}/add-ons`}>Stall add-ons</Link></Button>
              </>
            )}
          </div>
        </TabsContent>

        {/* DETAILS */}
        <TabsContent value="details">
          <Card>
            <SavingForm action={updateEventAction} guard savedMessage="Details saved">
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Event details</CardTitle>
                <CardDescription>Edit the basics and the public page details.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <EventDetailsFields
                  defaults={{
                    name: event.name,
                    description: event.description,
                    location: event.location,
                    startsAt: event.startsAt,
                    endsAt: event.endsAt,
                    capacity: event.capacity,
                    slug: event.slug,
                  }}
                  datesNote={
                    event.days.length > 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <Badge variant="primary">Synced</Badge>
                        <span>Multi-day event — these dates follow your per-day hours in the <Link href="?tab=schedule" className="font-medium text-primary hover:underline">Schedule tab</Link>.</span>
                      </div>
                    ) : null
                  }
                />
                <Button type="submit" className="w-fit">Save details</Button>
              </CardContent>
            </SavingForm>
          </Card>
        </TabsContent>

        {/* TICKETS */}
        <TabsContent value="tickets" className="space-y-6">
          {event.ticketTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet — add your first one below.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
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
          <Card asChild>
            <form action={addTicketTypeAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Add a ticket</CardTitle>
                <CardDescription>Set the price shoppers pay and how many are available.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Ticket name" required className="sm:col-span-2"><Input name="name" required placeholder="General, Couple, VIP…" /></Field>
                <Field label="Price (₹)" required><Input type="number" name="priceRupees" min={0} required placeholder="499" /></Field>
                <Field label="Early-bird price (₹)" hint="Optional"><Input type="number" name="earlyRupees" min={0} /></Field>
                <Field label="How many available" required><Input type="number" name="totalQty" min={1} required placeholder="2000" /></Field>
                <Field label="People admitted per ticket" hint="1 for solo, 2 for a couple pass."><Input type="number" name="attendeesPer" min={1} defaultValue={1} /></Field>
                <Button type="submit" className="w-fit sm:col-span-2">Add ticket</Button>
              </CardContent>
            </form>
          </Card>

          {/* Pricing rules — early-bird + bulk tiers (engine-driven; best single discount wins) */}
          <Card asChild>
            <form action={setPricingRulesAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Pricing rules</CardTitle>
                <CardDescription>
                  Early-bird and bulk discounts apply automatically at checkout. They never stack —
                  shoppers get the single best of early-bird, bulk, or coupon.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 rounded-lg border border-border p-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="earlyActive" defaultChecked={!!earlyBird?.active} className="size-4 rounded border-input accent-primary" />
                    Early-bird active
                  </label>
                  <Field label="Early-bird discount (%)" hint="Applied to every ticket type that has no explicit early-bird price set in the Tickets tab.">
                    <Input type="number" name="earlyPercent" min={0} max={100} defaultValue={earlyBird?.percent ?? ""} placeholder="15" className="sm:max-w-32" />
                  </Field>
                </div>

                <div className="grid gap-4 rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">Bulk tiers</p>
                  <p className="text-xs text-muted-foreground">Discount on the whole order once total tickets cross a threshold. Bulk only kicks in above 5 tickets. Leave a row blank to skip it.</p>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="grid items-end gap-4 sm:grid-cols-2">
                      <Field label={`Tier ${i + 1} — min tickets`}><Input type="number" name={`minQty${i}`} min={6} defaultValue={bulkTiers[i]?.minQty ?? ""} placeholder={i === 0 ? "6" : i === 1 ? "10" : "20"} /></Field>
                      <Field label="Discount (%)"><Input type="number" name={`percent${i}`} min={0} max={100} defaultValue={bulkTiers[i]?.percent ?? ""} placeholder={i === 0 ? "5" : i === 1 ? "10" : "15"} /></Field>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-fit">Save pricing rules</Button>
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        {/* SCHEDULE — event days + run of show */}
        <TabsContent value="schedule" className="space-y-6">
          {/* Event days */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event days</CardTitle>
              <CardDescription>Set each day&apos;s hours (e.g. 30 Oct 4:00 PM – 11:00 PM). These define the run of show and the event&apos;s overall dates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.days.length === 0 ? (
                <p className="text-sm text-muted-foreground">No days yet — add your first day below.</p>
              ) : (
                <ul className="space-y-2">
                  {event.days.map((d, idx) => (
                    <li key={d.id} className="rounded-lg border border-border p-4">
                      <form action={updateEventDayAction} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="eventId" value={event.id} />
                        <Field label="Label" hint="Optional"><Input name="label" defaultValue={d.label ?? ""} placeholder={`Day ${idx + 1}`} /></Field>
                        <Field label="Starts" required><DateTimePicker name="startsAt" required defaultValue={d.startsAt} /></Field>
                        <Field label="Ends" required><DateTimePicker name="endsAt" required defaultValue={d.endsAt} /></Field>
                        <div className="flex items-center gap-2">
                          <Button type="submit" variant="outline" size="sm">Save</Button>
                        </div>
                      </form>
                      <div className="mt-2">
                        <DeleteDayButton eventId={event.id} dayId={d.id} itemCount={event.schedule.filter((s) => s.eventDayId === d.id).length} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addEventDayAction} className="grid items-end gap-4 rounded-lg border border-dashed border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
                <input type="hidden" name="eventId" value={event.id} />
                <Field label="Label" hint="Optional"><Input name="label" placeholder="Day 1, Opening night…" /></Field>
                <Field label="Starts" required><DateTimePicker name="startsAt" required /></Field>
                <Field label="Ends" required><DateTimePicker name="endsAt" required /></Field>
                <div><Button type="submit" size="sm">Add day</Button></div>
              </form>
            </CardContent>
          </Card>

          {/* Run of show */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run of show</CardTitle>
              <CardDescription>The full timeline, day by day — artist sets (managed in the Lineup) plus everything else.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EventRunOfShow
                eventId={event.id}
                days={event.days.map((d) => ({ id: d.id, label: d.label, startsAtIso: d.startsAt.toISOString(), endsAtIso: d.endsAt.toISOString() }))}
                items={event.schedule.map((s) => ({
                  id: s.id, title: s.title,
                  startsAtIso: s.startsAt.toISOString(), endsAtIso: s.endsAt ? s.endsAt.toISOString() : null,
                  stageOrZone: s.stageOrZone, performer: s.performer,
                  artistId: s.artistBooking?.artistId ?? null, eventDayId: s.eventDayId,
                }))}
              />
              <ActionForm action={createBookingAction} success="Added to lineup — set the set time in the Lineup tab" className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
                <input type="hidden" name="eventId" value={event.id} />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Add an artist<span aria-hidden="true" className="text-destructive"> *</span></span>
                  <Select name="artistId" required className="w-64" defaultValue="">
                    <option value="" disabled>Choose an artist…</option>
                    {roster.map((a) => <option key={a.id} value={a.id}>{a.stageName}</option>)}
                  </Select>
                </label>
                <Button type="submit" size="sm" variant="outline">Add artist</Button>
              </ActionForm>
            </CardContent>
          </Card>

          {/* Add a manual item */}
          <Card asChild>
            <form action={addScheduleItemAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Add to the schedule</CardTitle>
                <CardDescription>Sets, performances, and zone openings — shown on the event page.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="What's happening" required className="sm:col-span-2"><Input name="title" required placeholder="Headline set, food court opens…" /></Field>
                {event.days.length > 0 && (
                  <Field label="Day" className="sm:col-span-2" hint="Which event day this belongs to">
                    <Select name="eventDayId" defaultValue="">
                      <option value="">— No specific day —</option>
                      {event.days.map((d, idx) => <option key={d.id} value={d.id}>{(d.label?.trim() || `Day ${idx + 1}`)} · {dayLabelDate(d.startsAt)}</option>)}
                    </Select>
                  </Field>
                )}
                <Field label="Starts" required><DateTimePicker name="startsAt" required /></Field>
                <Field label="Ends" hint="Optional"><DateTimePicker name="endsAt" /></Field>
                <Field label="Stage / zone" hint="Optional"><Input name="stageOrZone" placeholder="Main Stage" /></Field>
                <Field label="Performer" hint="Optional"><Input name="performer" /></Field>
                <Button type="submit" className="w-fit sm:col-span-2">Add to schedule</Button>
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        {/* LINEUP (artists) */}
        <TabsContent value="lineup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Artist lineup</CardTitle>
              <CardDescription>Book artists for this event, negotiate, set times. Confirmed sets publish to the schedule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActionForm action={createBookingAction} success="Added to lineup" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="eventId" value={event.id} />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Add an artist<span aria-hidden="true" className="text-destructive"> *</span></span>
                  <Select name="artistId" required className="w-64" defaultValue="">
                    <option value="" disabled>Choose an artist…</option>
                    {roster.map((a) => <option key={a.id} value={a.id}>{a.stageName}</option>)}
                  </Select>
                </label>
                <Button type="submit" size="sm">Add to lineup</Button>
              </ActionForm>

              {lineup.length === 0 ? (
                <p className="text-sm text-muted-foreground">No artists booked yet.</p>
              ) : (
                <div className="grid gap-3">
                  {lineup.map((b) => (
                    <BookingPanel
                      key={b.id}
                      title={b.artist.stageName}
                      booking={{
                        id: b.id,
                        artistId: b.artistId,
                        eventId: event.id,
                        status: b.status,
                        settlement: b.settlement,
                        agreedFeePaise: b.agreedFeePaise,
                        setStartsAt: b.setStartsAt ? b.setStartsAt.toISOString() : null,
                        setEndsAt: b.setEndsAt ? b.setEndsAt.toISOString() : null,
                        stageOrZone: b.stageOrZone,
                        published: b.published,
                        negotiationNote: b.negotiationNote,
                        payouts: b.payouts.map((p) => ({ amountPaise: p.amountPaise, status: p.status, incurredAt: p.incurredAt.toISOString() })),
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STALLS — venue map, stall types, add-ons; one canonical path to the designer */}
        <TabsContent value="stalls" className="space-y-6">
          <Card>
            <SavingForm action={setVendorStallsAction} savedMessage="Saved">
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Vendor stalls</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="vendorStallsEnabled" defaultChecked={event.vendorStallsEnabled} className="mt-0.5 size-4 rounded border-input accent-primary" />
                  <span>
                    <span className="font-medium">This event sells stall space to vendors</span>
                    <span className="block text-xs text-muted-foreground">Turn off for ticket-only events — map and stall checks are skipped and vendor booking is hidden.</span>
                  </span>
                </label>
                <Button type="submit" variant="outline" size="sm">Save</Button>
              </CardContent>
            </SavingForm>
          </Card>

          {!event.vendorStallsEnabled ? (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Vendor stalls are off — this event is ticket-only. Turn them on above to manage the venue map, stall types, and add-ons.
            </p>
          ) : (
            <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Venue map</CardTitle>
                  <CardDescription>Draw stalls, zones and infrastructure in the designer — vendors book from this layout.</CardDescription>
                </div>
                <Button asChild size="sm"><Link href={`/admin/events/${event.id}/map`}>Open map designer</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stallStats.total > 0 ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{stallStats.total}</span> stalls ·{" "}
                  <span className="font-medium text-foreground">{stallStats.priced}</span> priced ·{" "}
                  <span className="font-medium text-foreground">{stallStats.booked}</span> booked
                  {stallStats.held > 0 && <> · <span className="font-medium text-foreground">{stallStats.held}</span> held/pending</>}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No stalls yet — open the designer to draw the layout, or copy one from the map library below.</p>
              )}
              <div className="border-t border-border pt-4">
                <MapAttach eventId={event.id} maps={mapSummaries} currentMapId={event.mapId} activeStallCount={activeStallLabels.length} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stall types &amp; pricing</CardTitle>
              <CardDescription>Types set the default price and size for the stalls painted with them — managed in the <Link href={`/admin/events/${event.id}/map`} className="text-primary hover:underline">map designer</Link>.</CardDescription>
            </CardHeader>
            <CardContent>
              {event.stallTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stall types yet — they&apos;re seeded when you first open the designer.</p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {event.stallTypes.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-3 rounded-sm border border-border" style={{ backgroundColor: t.color ?? undefined }} />
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground">{t.widthFt}×{t.heightFt} ft</span>
                        {!t.sellable && <Badge variant="neutral">Infra</Badge>}
                      </span>
                      <span className={t.priceInPaise > 0 ? "" : "text-muted-foreground"}>{t.priceInPaise > 0 ? formatPaise(t.priceInPaise) : "No price"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Stall add-ons</CardTitle>
                  <CardDescription>Extras vendors can order with their stall — tables, power, signage.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm"><Link href={`/admin/events/${event.id}/add-ons`}>Manage add-ons</Link></Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{event._count.addOns > 0 ? `${event._count.addOns} add-on${event._count.addOns === 1 ? "" : "s"} configured.` : "None yet."}</p>
            </CardContent>
          </Card>
            </>
          )}
        </TabsContent>

        {/* SETTINGS — theme + logistics */}
        <TabsContent value="settings" className="space-y-6">
          <Card asChild>
            <form action={setEventThemeAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Event colours</CardTitle>
                <CardDescription>White-label this event&apos;s public page. Leave blank to use the BDQ brand.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <ThemeColorField name="primary" label="Primary colour" hint="Buttons + accents. Hex like #01065B." defaultValue={theme?.primary ?? ""} placeholder="#01065B" />
                <ThemeColorField name="accent" label="Accent colour" hint="Highlights. Hex like #D69A22." defaultValue={theme?.accent ?? ""} placeholder="#D69A22" />
                <Button type="submit" className="w-fit sm:col-span-2">Save theme</Button>
              </CardContent>
            </form>
          </Card>

          {/* Logistics — add-on window + vendor load-in */}
          <Card asChild>
            <form action={setEventLogisticsAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <CardHeader>
                <CardTitle className="text-base">Logistics</CardTitle>
                <CardDescription>Vendor setup access and the add-on ordering deadline. Shown to booked vendors.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Add-on ordering closes (hours before start)" hint="Leave blank for the default of 48 hours.">
                  <Input type="number" name="addOnCloseHours" min={0} max={720} defaultValue={event.addOnCloseHours ?? ""} placeholder="48" className="sm:max-w-32" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vendor load-in starts" hint="When vendors can enter to set up — often 1–2 days before."><DateTimePicker name="loadInStartsAt" defaultValue={event.loadInStartsAt ?? undefined} /></Field>
                  <Field label="Vendor load-in ends"><DateTimePicker name="loadInEndsAt" defaultValue={event.loadInEndsAt ?? undefined} /></Field>
                </div>
                <Button type="submit" className="w-fit">Save logistics</Button>
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        {/* DANGER */}
        <TabsContent value="danger">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Delete this event</CardTitle>
              <CardDescription>Removes the event and everything attached to it. This cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteEventButton eventId={event.id} eventName={event.name} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
