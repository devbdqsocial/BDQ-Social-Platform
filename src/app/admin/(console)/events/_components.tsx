import Link from "next/link";
import type { listAllForAdmin } from "@/server/events/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { publishEventAction } from "./actions";

type EventRow = Awaited<ReturnType<typeof listAllForAdmin>>[number];

const isLive = (s: string) => s === "PUBLISHED" || s === "LIVE";
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);

export function EventsNav({ active }: { active: "all" | "past" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant={active === "all" ? "secondary" : "ghost"} size="sm">
        <Link href="/admin/events">All events</Link>
      </Button>
      <Button asChild variant={active === "past" ? "secondary" : "ghost"} size="sm">
        <Link href="/admin/events/past">Past events</Link>
      </Button>
      <Button asChild size="sm" className="ml-auto">
        <Link href="/admin/events/new">Create event</Link>
      </Button>
    </div>
  );
}

export function EventList({ events, empty }: { events: EventRow[]; empty: string }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {events.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 p-4">
          <Link href={`/admin/events/${e.id}`} className="group min-w-0">
            <p className="flex items-center gap-2 font-medium group-hover:text-primary">
              <span className="truncate">{e.name}</span>
              <Badge variant={isLive(e.status) ? "success" : "neutral"}>{isLive(e.status) ? "Live" : "Draft"}</Badge>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmtDate(e.startsAt)} · {e._count.ticketTypes} ticket type{e._count.ticketTypes === 1 ? "" : "s"} · {e._count.orders} order{e._count.orders === 1 ? "" : "s"}
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
  );
}
