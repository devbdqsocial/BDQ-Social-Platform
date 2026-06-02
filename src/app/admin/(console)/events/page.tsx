import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listAllForAdmin } from "@/server/events/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { createEventAction, publishEventAction } from "./actions";

export const metadata: Metadata = { title: "Events" };

const isLive = (s: string) => s === "PUBLISHED" || s === "LIVE";

export default async function AdminEventsPage() {
  await requireSuperAdmin();
  const events = await listAllForAdmin();

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Events" description="Create an event, add ticket prices, then publish it to go live on the public site." />

      <Card asChild>
        <form action={createEventAction}>
          <CardHeader>
            <CardTitle>Add an event</CardTitle>
            <CardDescription>You can add ticket types and prices on the next screen.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Event name">
              <Input name="name" required placeholder="BDQ Social — October Edition" />
            </Field>
            <Field label="Short description">
              <Textarea name="description" rows={2} placeholder="A line about the event for the public page." />
            </Field>
            <Field label="Location">
              <Input name="location" placeholder="Venue name, City" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <Input type="datetime-local" name="startsAt" required />
              </Field>
              <Field label="Ends">
                <Input type="datetime-local" name="endsAt" required />
              </Field>
            </div>
            <Field label="Capacity" hint="Optional — leave blank for no limit.">
              <Input type="number" name="capacity" min={1} />
            </Field>
            <Button type="submit" className="w-fit">Add event</Button>
          </CardContent>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">All events ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet — add your first one above.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 p-4">
                <Link href={`/admin/events/${e.id}`} className="group min-w-0">
                  <p className="flex items-center gap-2 font-medium group-hover:text-primary">
                    <span className="truncate">{e.name}</span>
                    <Badge variant={isLive(e.status) ? "success" : "neutral"}>{isLive(e.status) ? "Live" : "Draft"}</Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e._count.ticketTypes} ticket type{e._count.ticketTypes === 1 ? "" : "s"} · {e._count.orders} order{e._count.orders === 1 ? "" : "s"}
                  </p>
                </Link>
                {!isLive(e.status) && (
                  <form action={publishEventAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" variant="outline" size="sm">Publish</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
