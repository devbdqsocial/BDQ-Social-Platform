"use client";

import { useEffect, useMemo, useState } from "react";
import { getHomeMode, resolveNowNext, type ScheduleSlot } from "@/lib/home-mode";
import { groupByDay, stagesOf, itemPhase, dayKey, type Phase } from "@/lib/schedule";
import { icsHref } from "@/lib/ics";

export interface ScheduleItemDto {
  id: string;
  title: string;
  startsAtIso: string;
  endsAtIso: string | null;
  stageOrZone: string | null;
  performer: string | null;
  eventDayId?: string | null;
}

export interface ScheduleDayDto {
  id: string;
  label: string | null;
  startsAtIso: string;
  endsAtIso: string;
}

interface Props {
  eventName: string;
  location: string | null;
  startsAtIso: string;
  endsAtIso: string;
  status: string;
  items: ScheduleItemDto[];
  days?: ScheduleDayDto[];
}

const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const PHASE_LABEL: Partial<Record<Phase, string>> = { live: "Live now", soon: "Starting soon" };

export function ScheduleTimeline({ eventName, location, startsAtIso, endsAtIso, status, items, days }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [stage, setStage] = useState<string | null>(null);
  const [dayK, setDayK] = useState<string | null>(null);

  // 60s tick keeps now/next + the now-line alive (customer-portal §3.3).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const slots = useMemo<ScheduleSlot[]>(
    () => items.map((i) => ({ id: i.id, title: i.title, startsAt: new Date(i.startsAtIso), endsAt: i.endsAtIso ? new Date(i.endsAtIso) : null, stageOrZone: i.stageOrZone, performer: i.performer })),
    [items],
  );
  const eventDayOf = useMemo(() => new Map(items.map((i) => [i.id, i.eventDayId ?? null])), [items]);
  const dayWindows = useMemo(
    () => (days ?? []).map((d, idx) => ({ id: d.id, label: d.label?.trim() || `Day ${idx + 1}`, startsAt: new Date(d.startsAtIso), endsAt: new Date(d.endsAtIso) })),
    [days],
  );

  const mode = getHomeMode({ startsAt: new Date(startsAtIso), endsAt: new Date(endsAtIso), status }, now);
  const nn = useMemo(() => resolveNowNext(slots, now), [slots, now]);
  const stages = useMemo(() => stagesOf(slots), [slots]);

  // Group by explicit event days (festival days, overnight-safe) when defined; else by calendar date.
  const dayGroups = useMemo(() => {
    if (dayWindows.length > 0) {
      const resolve = (s: ScheduleSlot): string | null => {
        const explicit = eventDayOf.get(s.id);
        if (explicit) return explicit;
        const t = s.startsAt.getTime();
        return dayWindows.find((d) => t >= d.startsAt.getTime() && t <= d.endsAt.getTime())?.id ?? null;
      };
      const groups = dayWindows.map((d) => ({ key: d.id, label: d.label, startsAt: d.startsAt as Date | undefined, endsAt: d.endsAt as Date | undefined, items: slots.filter((s) => resolve(s) === d.id) }));
      const leftover = slots.filter((s) => resolve(s) === null);
      if (leftover.length) groups.push({ key: "other", label: "More", startsAt: undefined, endsAt: undefined, items: leftover });
      return groups.filter((g) => g.items.length > 0);
    }
    return groupByDay(slots).map((d) => ({ key: d.key, label: dayLabel(d.date), startsAt: undefined as Date | undefined, endsAt: undefined as Date | undefined, items: d.items }));
  }, [dayWindows, slots, eventDayOf]);

  const liveGroupKey = dayWindows.length
    ? dayGroups.find((g) => g.startsAt && g.endsAt && now >= g.startsAt && now <= g.endsAt)?.key
    : dayGroups.find((g) => g.key === dayKey(now))?.key;
  const activeDayK = dayK ?? liveGroupKey ?? dayGroups[0]?.key ?? null;
  const activeDay = dayGroups.find((g) => g.key === activeDayK) ?? dayGroups[0];
  const isToday = !!activeDay && activeDay.key === liveGroupKey;
  const dayItems = (activeDay?.items ?? []).filter((s) => !stage || s.stageOrZone === stage);
  const nowLineBefore = isToday ? dayItems.findIndex((s) => itemPhase(s, now) !== "done") : -1;

  const ics = (s: ScheduleSlot) => icsHref({ uid: `sch_${s.id}`, title: `${s.title}${eventName ? ` · ${eventName}` : ""}`, start: s.startsAt, end: s.endsAt ?? undefined, location: location ?? undefined, description: [s.performer, s.stageOrZone].filter(Boolean).join(" · ") || undefined });

  if (slots.length === 0) {
    return <p className="f-paragraph p-[var(--space-2xl)] text-center opacity-70" style={{ border: "1px dashed var(--color)" }}>The line-up drops closer to the event. Check back soon.</p>;
  }

  return (
    <div className="space-y-[var(--space-2xl)]">
      <p className="sr-only" aria-live="polite">{nn.now.length ? `Now: ${nn.now.map((s) => s.title).join(", ")}` : "Nothing on right now"}</p>

      {/* NOW / NEXT — the live pulse of the festival */}
      {(nn.now.length > 0 || (mode === "LIVE" && nn.next.length > 0)) && (
        <div className="bdq-night paint -mx-[var(--space-lg)] px-[var(--space-lg)] py-[var(--space-xl)]">
          {nn.now.length > 0 && (
            <>
              <p className="kicker flex items-center gap-[var(--space-sm)]"><span className="inline-block size-2 animate-pulse rounded-full bg-lavender-400" /> On now</p>
              <ul className="mt-[var(--space-md)] flex gap-[var(--space-md)] overflow-x-auto pb-[var(--space-xs)]">
                {nn.now.map((s) => (
                  <li key={s.id} className="bdq-surface-alt shrink-0 rounded-[var(--radius-lg)] p-[var(--space-lg)]" style={{ minWidth: "16rem" }}>
                    <p className="f-exat f-h32">{s.title}</p>
                    <p className="f-paragraph-small mt-[var(--space-xs)] opacity-75">{[s.performer, s.stageOrZone].filter(Boolean).join(" · ") || "Happening now"}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          {nn.next.length > 0 && (
            <>
              <p className="kicker mt-[var(--space-lg)] opacity-80">Up next</p>
              <ul className="mt-[var(--space-md)] flex gap-[var(--space-md)] overflow-x-auto pb-[var(--space-xs)]">
                {nn.next.map((s) => (
                  <li key={s.id} className="shrink-0 rounded-[var(--radius-lg)] p-[var(--space-lg)]" style={{ minWidth: "14rem", border: "1px solid color-mix(in srgb, currentColor 30%, transparent)" }}>
                    <p className="kicker opacity-70">{time(s.startsAt)}{s.stageOrZone ? ` · ${s.stageOrZone}` : ""}</p>
                    <p className="f-exat mt-[var(--space-xs)] f-h32">{s.title}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Day pills (multi-day) */}
      {dayGroups.length > 1 && (
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {dayGroups.map((d) => (
            <button key={d.key} type="button" onClick={() => setDayK(d.key)} data-cursor
              className="rounded-full px-[var(--space-lg)] py-[var(--space-sm)] f-paragraph-small f-bold transition-colors"
              style={{ border: "1px solid var(--color)", background: d.key === activeDayK ? "var(--color)" : "transparent", color: d.key === activeDayK ? "var(--bgcolor)" : "var(--color)" }}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Stage / area filter */}
      {stages.length > 1 && (
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {[null, ...stages].map((s) => (
            <button key={s ?? "all"} type="button" onClick={() => setStage(s)} data-cursor
              className="rounded-full px-[var(--space-md)] py-[var(--space-xs)] f-paragraph-small transition-colors"
              style={{ border: "1px solid color-mix(in srgb, currentColor 35%, transparent)", background: stage === s ? "var(--color)" : "transparent", color: stage === s ? "var(--bgcolor)" : "var(--color)" }}>
              {s ?? "All stages"}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <ul>
        {dayItems.map((s, i) => {
          const phase = itemPhase(s, now);
          return (
            <li key={s.id}>
              {i === nowLineBefore && (
                <div className="flex items-center gap-[var(--space-sm)] py-[var(--space-sm)]" aria-hidden>
                  <span className="size-2.5 animate-pulse rounded-full bg-lavender-400" />
                  <span className="kicker text-lavender-400">Now · {time(now)}</span>
                  <span className="h-px flex-1 bg-lavender-400/40" />
                </div>
              )}
              <div className="flex items-baseline gap-[var(--space-lg)] py-[var(--space-lg)]" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 25%, transparent)", opacity: phase === "done" ? 0.45 : 1 }}>
                <span className="kicker w-[8ch] shrink-0 tabular-nums opacity-80">{time(s.startsAt)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[var(--space-md)]">
                    <p className="f-exat f-h32">{s.title}</p>
                    {PHASE_LABEL[phase] && <span className="badge-bdq">{PHASE_LABEL[phase]}</span>}
                  </div>
                  {(s.performer || s.stageOrZone) && <p className="f-paragraph-small mt-[var(--space-xs)] opacity-70">{[s.performer, s.stageOrZone].filter(Boolean).join(" · ")}</p>}
                </div>
                {phase !== "done" && (
                  <a href={ics(s)} download={`${s.title.replace(/\s+/g, "-").toLowerCase()}.ics`} className="f-paragraph-small f-bold t-upper link-underline shrink-0" style={{ letterSpacing: "0.06em" }} aria-label={`Add ${s.title} to calendar`}>Add</a>
                )}
              </div>
            </li>
          );
        })}
        {dayItems.length === 0 && <li className="f-paragraph-small py-[var(--space-lg)] opacity-70">Nothing on this stage today.</li>}
      </ul>
    </div>
  );
}
