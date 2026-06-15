"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track";
import { KIND_ACCENT, KIND_LABEL, type StripItem } from "@/lib/happening";

/**
 * Happening Strip (R6.3) — the event heartbeat: a horizontal, swipeable row of glanceable cards
 * (Apple Live Activities / Airbnb Discovery feel, never a news ticker). SSR-seeded; refreshes every
 * 60s ONLY when the event is live (no polling spam). Renders nothing when empty. Reduced-motion safe.
 */
export function HappeningStrip({ eventId, initial, live = false }: { eventId: string; initial: StripItem[]; live?: boolean }) {
  const [items, setItems] = useState<StripItem[]>(initial);

  useEffect(() => {
    track("happening_view", { eventId, count: initial.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/happening/${eventId}`);
        if (r.ok) setItems(((await r.json()) as { items: StripItem[] }).items);
      } catch {
        /* keep the last good strip */
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [live, eventId]);

  if (items.length === 0) return null;

  return (
    <section aria-label="Happening now" className="paint">
      <div className="wrapper max-w-[68rem] pt-[var(--space-2xl)]">
        <p className="kicker opacity-70">{live ? "Happening now" : "What's on"}</p>
      </div>
      <div
        className="no-scrollbar flex gap-[var(--space-md)] overflow-x-auto px-[var(--wrapper-padd)] pb-[var(--space-md)] pt-[var(--space-md)]"
        style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}
      >
        {items.map((it) => (
          <HappeningCard key={it.id} it={it} eventId={eventId} />
        ))}
      </div>
    </section>
  );
}

function HappeningCard({ it, eventId }: { it: StripItem; eventId: string }) {
  const accent = KIND_ACCENT[it.kind] ?? "var(--light-blue)";
  const inner = (
    <div
      className="flex h-full w-[min(78vw,300px)] shrink-0 flex-col rounded-[var(--radius-lg)] p-[var(--space-lg)]"
      style={{ scrollSnapAlign: "start", border: "1px solid color-mix(in srgb, currentColor 14%, transparent)", background: "color-mix(in srgb, currentColor 4%, transparent)" }}
    >
      <div className="flex items-center gap-[var(--space-sm)]">
        {it.kind === "LIVE_NOW" && <span aria-hidden className="happening-pulse inline-block size-2 rounded-full" style={{ background: accent }} />}
        <span className="kicker" style={{ color: accent }}>{it.emoji} {KIND_LABEL[it.kind] ?? it.kind}</span>
      </div>
      <p className="f-paragraph mt-[var(--space-sm)] font-bold leading-snug">{it.title}</p>
      {it.detail && <p className="f-paragraph-small mt-[var(--space-xs)] opacity-65">{it.detail}</p>}
    </div>
  );

  if (!it.href) return inner;
  return (
    <Link href={it.href} onClick={() => track("happening_click", { eventId, kind: it.kind, id: it.id })} className="block">
      {inner}
    </Link>
  );
}
