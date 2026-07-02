"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { stallsToRenderLayout, type StallLike } from "@/lib/map/normalize";
import type { RenderExtras } from "@/lib/map/render-types";
import { type StallStatus } from "@/lib/stall-colors";
import { formatPaise } from "@/lib/utils";
import { StallLegend } from "@/components/map/StallLegend";
import { ZoneLegend } from "@/components/map/ZoneLegend";
import { reserveStallAction } from "@/app/vendor/(app)/onboarding/actions";

const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => (
    <div
      className="f-paragraph-small grid h-96 place-items-center rounded-[var(--radius-lg)] opacity-70"
      style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}
    >
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
  /** Spot-quality label from the score tier, e.g. "Prime spot · 86/100" (stall comparison). */
  quality?: string | null;
}

const STATUS_COPY: Record<string, string> = { AVAILABLE: "Available", BOOKED: "Taken", HELD: "On hold", PENDING: "Pending", BLOCKED: "Unavailable" };

/** Approve-before-pay: selecting a stall RESERVES it (no payment) and moves to the agreement step. */
export function VendorStallReserve({ eventId, stalls, details = {}, extras }: { eventId: string; stalls: StallInput[]; details?: Record<string, StallDetail>; extras?: RenderExtras }) {
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
      router.push("/vendor/home?step=contract");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reserve");
      setBusy(false);
    }
  };

  const price = sel ? priceByLabel[sel] : null;
  const detail = sel ? details[sel] : null;
  const status = sel ? (statuses[sel] ?? "AVAILABLE") : null;

  const chip = "f-paragraph-small rounded-full px-[var(--space-md)] py-[2px] font-bold";
  const chipStyle = { border: "1px solid color-mix(in srgb, currentColor 28%, transparent)" } as const;

  return (
    <div className="grid gap-[var(--space-lg)] lg:grid-cols-[1fr_320px]">
      <div className="space-y-[var(--space-lg)]">
        <StallLegend />
        <MapCanvas layout={layout} statuses={statuses} selected={selected} onSelect={toggle} focusLabel={sel ?? null} extras={extras} />
        {extras?.zones && <ZoneLegend zones={extras.zones} />}
      </div>

      {/* Stall sheet (map-system §11) — why-this-stall bullets + size + zone, then Reserve. */}
      <aside
        className="h-fit rounded-[var(--radius-lg)] p-[var(--space-xl)]"
        style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)", background: "color-mix(in srgb, currentColor 3%, transparent)" }}
      >
        {!sel ? (
          <p className="f-paragraph-small opacity-70 text-pretty">Tap an open stall on the map to see why it&apos;s a great spot and reserve it.</p>
        ) : (
          <div className="space-y-[var(--space-lg)]">
            <div>
              <div className="flex flex-wrap items-center gap-[var(--space-sm)]">
                <span className="badge-bdq">{sel}</span>
                {detail?.typeName && <span className={chip} style={chipStyle}>{detail.typeName}</span>}
                {detail?.zone && <span className={chip} style={chipStyle}>{detail.zone}</span>}
              </div>
              {detail?.quality && <p className="kicker mt-[var(--space-md)]" style={{ color: "var(--light-blue)" }}>{detail.quality}</p>}
              {price != null && <p className="f-exat f-h42 mt-[var(--space-xs)]">{formatPaise(price)}</p>}
              {detail?.sizeFt && <p className="f-paragraph-small opacity-70">{detail.sizeFt}</p>}
            </div>

            {detail && detail.bullets.length > 0 && (
              <div>
                <p className="kicker opacity-60">Why this stall</p>
                <ul className="mt-[var(--space-sm)] space-y-1">
                  {detail.bullets.map((b, i) => (
                    <li key={i} className="f-paragraph-small flex gap-[var(--space-sm)]">
                      <span aria-hidden style={{ color: "var(--light-blue)" }}>·</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="f-paragraph-small"><span className="opacity-60">Status: </span>{STATUS_COPY[status ?? "AVAILABLE"] ?? status}</p>

            <button
              type="button"
              disabled={busy || status !== "AVAILABLE"}
              onClick={reserve}
              data-cursor
              className="btn btn--lg btn--accent"
            >
              <span className="btn__text">{busy ? "Reserving…" : status === "AVAILABLE" ? `Reserve ${sel}` : "Taken"}</span>
            </button>
            {err && <p className="f-paragraph-small font-bold" style={{ color: "var(--red)" }}>{err}</p>}
            <p className="f-paragraph-small opacity-60 text-pretty">
              Reserving holds this stall for you. You&apos;ll sign the agreement next; payment comes after our team approves you.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
