"use client";

import { useEffect, useState } from "react";

type Snapshot = {
  event: string | null;
  capacity: number | null;
  checkedIn: number;
  sold: number;
  byType: { name: string; checkedIn: number; sold: number }[];
};

/** Live attendance board — polls the capacity snapshot every 5s. */
export function CapacityBoard({ eventId }: { eventId: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/admin/capacity?eventId=${eventId}`, { cache: "no-store" });
        const j = await r.json();
        if (active && j.ok) setSnap(j.data);
      } catch {
        /* keep last snapshot on a blip */
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [eventId]);

  if (!snap) return null;
  const pct = snap.capacity ? Math.min(100, Math.round((snap.checkedIn / snap.capacity) * 100)) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Inside now</p>
          <p className="font-display text-4xl font-semibold tabular-nums">{snap.checkedIn}</p>
        </div>
        <p className="text-right text-sm text-muted-foreground">
          {snap.sold} sold{snap.capacity != null ? ` · cap ${snap.capacity}` : ""}
          {pct != null && <span className="block font-medium text-foreground">{pct}% full</span>}
        </p>
      </div>
      {pct != null && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {snap.byType.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {snap.byType.map((t) => (
            <span key={t.name}>{t.name}: <span className="font-medium text-foreground">{t.checkedIn}</span>/{t.sold}</span>
          ))}
        </div>
      )}
    </div>
  );
}
