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

/** Approve-before-pay: selecting a stall RESERVES it (no payment) and moves to the agreement step. */
export function VendorStallReserve({ eventId, stalls }: { eventId: string; stalls: StallInput[] }) {
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

  return (
    <div className="space-y-4">
      <StallLegend />
      <MapCanvas layout={layout} statuses={statuses} selected={selected} onSelect={toggle} />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!sel || busy} onClick={reserve}>
          {busy ? "Reserving…" : sel ? `Reserve ${sel}${price != null ? ` · ${formatPaise(price)}` : ""}` : "Select an available stall"}
        </Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Reserving holds this stall for you. You&apos;ll sign the agreement next; payment comes after our team approves you.
      </p>
    </div>
  );
}
