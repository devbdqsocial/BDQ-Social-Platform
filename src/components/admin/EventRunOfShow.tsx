import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { detectStageConflicts, type ConflictSlot } from "@/lib/schedule-conflicts";
import { deleteScheduleItemAction } from "@/app/admin/(console)/events/[id]/actions";

export interface RunOfShowItem {
  id: string;
  title: string;
  startsAtIso: string;
  endsAtIso: string | null;
  stageOrZone: string | null;
  performer: string | null;
  artistId: string | null; // non-null => an artist set (managed in the Lineup)
  eventDayId: string | null;
}
export interface RunOfShowDay {
  id: string;
  label: string | null;
  startsAtIso: string;
  endsAtIso: string;
}

const DEFAULT_BLOCK_MS = 45 * 60 * 1000;
const fmtT = (d: Date) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function toSlot(i: RunOfShowItem): ConflictSlot {
  return { id: i.id, label: i.title, stageOrZone: i.stageOrZone, startsAt: new Date(i.startsAtIso), endsAt: i.endsAtIso ? new Date(i.endsAtIso) : null };
}

/** One day's run of show: a stage-lane time-grid (visual) + a detailed list with actions. */
function DaySection({ eventId, label, startsAtIso, endsAtIso, items }: { eventId: string; label: string; startsAtIso: string; endsAtIso: string; items: RunOfShowItem[] }) {
  const dayStart = new Date(startsAtIso).getTime();
  const dayEnd = new Date(endsAtIso).getTime();
  const dur = Math.max(1, dayEnd - dayStart);
  const conflicts = detectStageConflicts(items.map(toSlot));
  const clashIds = new Set(conflicts.flatMap((c) => [c.a.id, c.b.id]));

  // stage lanes (null stage → "Unassigned"), each sorted by time
  const laneNames = [...new Set(items.map((i) => i.stageOrZone?.trim() || "Unassigned"))];
  const sorted = [...items].sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          {endsAtIso ? `${fmtDate(new Date(startsAtIso))} · ${fmtT(new Date(startsAtIso))} – ${fmtT(new Date(endsAtIso))}` : fmtDate(new Date(startsAtIso))}
        </p>
      </div>

      {conflicts.length > 0 && (
        <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm">
          <span className="font-medium">Stage clash ({conflicts.length}):</span>{" "}
          <span className="text-muted-foreground">{conflicts.map((c) => `${c.stage} — ${c.a.label} / ${c.b.label}`).join("; ")}</span>
        </div>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Nothing scheduled for this day yet.</p>
      ) : (
        <>
          {/* Visual lane grid */}
          <div className="overflow-x-auto px-4 py-3">
            <div className="min-w-[640px] space-y-1.5">
              {laneNames.map((lane) => (
                <div key={lane} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-xs text-muted-foreground" title={lane}>{lane}</span>
                  <div className="relative h-9 flex-1 rounded bg-muted/40">
                    {sorted
                      .filter((i) => (i.stageOrZone?.trim() || "Unassigned") === lane)
                      .map((i) => {
                        const s = new Date(i.startsAtIso).getTime();
                        const e = i.endsAtIso ? new Date(i.endsAtIso).getTime() : s + DEFAULT_BLOCK_MS;
                        const left = clamp((s - dayStart) / dur, 0, 1) * 100;
                        const width = clamp((Math.min(e, dayEnd) - Math.max(s, dayStart)) / dur, 0.03, 1) * 100;
                        const isArtist = i.artistId != null;
                        const isClash = clashIds.has(i.id);
                        return (
                          <div
                            key={i.id}
                            className={`absolute top-1 bottom-1 overflow-hidden rounded px-1.5 text-[11px] leading-tight ${isArtist ? "bg-primary/20 text-primary-foreground" : "bg-foreground/10"} ${isClash ? "ring-1 ring-destructive" : ""}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${i.title} · ${fmtT(new Date(i.startsAtIso))}${i.endsAtIso ? `–${fmtT(new Date(i.endsAtIso))}` : ""}`}
                          >
                            <span className="block truncate font-medium text-foreground">{i.title}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed list with actions */}
          <ul className="divide-y divide-border border-t border-border">
            {sorted.map((i) => (
              <li key={i.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${clashIds.has(i.id) ? "bg-destructive/5" : ""}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{i.title}</span>
                    {i.artistId && <Badge variant="primary">Artist</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtT(new Date(i.startsAtIso))}{i.endsAtIso ? `–${fmtT(new Date(i.endsAtIso))}` : ""}
                    {i.stageOrZone ? ` · ${i.stageOrZone}` : ""}
                    {i.performer ? ` · ${i.performer}` : ""}
                  </p>
                </div>
                {i.artistId ? (
                  <Button asChild variant="ghost" size="sm"><Link href={`/admin/artists/${i.artistId}`}>Manage in Lineup →</Link></Button>
                ) : (
                  <form action={deleteScheduleItemAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <Button type="submit" variant="ghost" size="sm">Remove</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function EventRunOfShow({ eventId, days, items }: { eventId: string; days: RunOfShowDay[]; items: RunOfShowItem[] }) {
  const dayIds = new Set(days.map((d) => d.id));
  const byDay = (dayId: string | null) => items.filter((i) => i.eventDayId === dayId);
  const unassigned = items.filter((i) => !i.eventDayId || !dayIds.has(i.eventDayId));

  if (days.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Add your event days above, then build each day&apos;s run of show. Confirmed artist sets appear here automatically.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((d, idx) => (
        <DaySection
          key={d.id}
          eventId={eventId}
          label={d.label?.trim() || `Day ${idx + 1}`}
          startsAtIso={d.startsAtIso}
          endsAtIso={d.endsAtIso}
          items={byDay(d.id)}
        />
      ))}
      {unassigned.length > 0 && (
        <DaySection eventId={eventId} label="Not assigned to a day" startsAtIso={unassigned[0].startsAtIso} endsAtIso={unassigned[0].startsAtIso} items={unassigned} />
      )}
    </div>
  );
}
