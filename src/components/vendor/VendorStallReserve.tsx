"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { stallsToRenderLayout, type StallLike } from "@/lib/map/normalize";
import { type StallStatus } from "@/lib/stall-colors";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/utils";
import { StallLegend } from "@/components/map/StallLegend";
import { reserveStallAction } from "@/app/vendor/(app)/onboarding/actions";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-96 place-items-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
      Loading event layout…
    </div>
  ),
});

interface StallInput extends StallLike {
  id: string;
  status: string;
  priceInPaise: number | null;
}

/** "Why this stall" detail for the picker sheet (map-system §11, from R2.5.10 scoring). */
export interface StallDetail {
  typeName: string;
  zone: string | null;
  bullets: string[];
  sizeFt: string;
}

const STATUS_COPY: Record<string, string> = { AVAILABLE: "Available", BOOKED: "Taken", HELD: "On hold", PENDING: "Pending", BLOCKED: "Unavailable" };

/** Approve-before-pay: selecting a stall RESERVES it (no payment) and moves to the agreement step. */
export function VendorStallReserve({ eventId, stalls, details = {} }: { eventId: string; stalls: StallInput[]; details?: Record<string, StallDetail> }) {
  const router = useRouter();
  const idByLabel = useMemo(() => Object.fromEntries(stalls.map((s) => [s.label, s.id])), [stalls]);
  const priceByLabel = useMemo(() => Object.fromEntries(stalls.map((s) => [s.label, s.priceInPaise])), [stalls]);
  const { layout } = useMemo(() => stallsToRenderLayout(stalls), [stalls]);
  const statuses = useMemo<Record<string, StallStatus>>(
    () => Object.fromEntries(stalls.filter((s) => s.kind !== "INFRA").map((s) => [s.label, s.status as StallStatus])),
    [stalls],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sel = [...selected][0];

  const toggle = (label: string) => {
    if ((statuses[label] ?? "AVAILABLE") !== "AVAILABLE") return;
    setSelected((prev) => (prev.has(label) ? new Set() : new Set([label])));
  };

  const reserve = async () => {
    if (!sel) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await reserveStallAction(eventId, idByLabel[sel]);
      if (!r.ok) throw new Error(r.error ?? "Could not reserve");
      router.push("/vendor/onboarding?step=contract");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reserve");
      setBusy(false);
    }
  };

  const price = sel ? priceByLabel[sel] : null;
  const detail = sel ? details[sel] : null;
  const status = sel ? (statuses[sel] ?? "AVAILABLE") : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StallLegend />
        <MapCanvas layout={layout} statuses={statuses} selected={selected} onSelect={toggle} />
      </div>

      {/* Stall sheet (map-system §11) — why-this-stall bullets + size + zone, then Reserve. */}
      <aside className="rounded-xl border border-border bg-card p-5">
        {!sel ? (
          <p className="text-sm text-muted-foreground">Tap an open stall on the map to see why it&apos;s a great spot and reserve it.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{sel}</span>
                {detail?.typeName && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">{detail.typeName}</span>}
                {detail?.zone && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">{detail.zone}</span>}
              </div>
              {price != null && <p className="mt-2 font-display text-2xl font-bold">{formatPaise(price)}</p>}
              {detail?.sizeFt && <p className="text-sm text-muted-foreground">{detail.sizeFt}</p>}
            </div>

            {detail && detail.bullets.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Why this stall</p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {detail.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2"><span aria-hidden className="text-primary">·</span>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm"><span className="text-muted-foreground">Status:</span> {STATUS_COPY[status ?? "AVAILABLE"] ?? status}</p>

            <Button className="w-full" disabled={busy || status !== "AVAILABLE"} onClick={reserve}>
              {busy ? "Reserving…" : status === "AVAILABLE" ? `Reserve ${sel}` : "Not available"}
            </Button>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <p className="text-xs text-muted-foreground">
              Reserving holds this stall for you. You&apos;ll sign the agreement next; payment comes after our team approves you.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
