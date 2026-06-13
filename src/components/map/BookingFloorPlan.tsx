"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { stallsToRenderLayout, type StallLike } from "@/lib/map/normalize";
import { type StallStatus } from "@/lib/stall-colors";
import { StallLegend } from "./StallLegend";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
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
}

/**
 * Public read-only event layout. Booking collapse (build-plan R1.3): the old select-to-hold
 * flow is gone — stalls are reserved only through the vendor portal (RESERVED → approval →
 * payment). R3.5 replaces this view with the customer brand map (map-system §11b).
 */
export function BookingFloorPlan({ stalls, canvas }: { stalls: StallInput[]; canvas?: { widthFt: number; heightFt: number } }) {
  const { layout } = useMemo(() => stallsToRenderLayout(stalls, canvas), [stalls, canvas]);
  const statuses = useMemo<Record<string, StallStatus>>(
    () =>
      Object.fromEntries(
        stalls.filter((s) => s.kind !== "INFRA").map((s) => [s.label, s.status as StallStatus]),
      ),
    [stalls],
  );
  const stallList = stalls.filter((s) => s.kind !== "INFRA");

  return (
    <div className="space-y-4">
      <StallLegend />
      <div aria-hidden="true">
        <MapCanvas layout={layout} statuses={statuses} />
      </div>
      <p className="text-sm">
        Want a stall here?{" "}
        <Link href="/vendor/signup?zone=vendor" className="font-medium underline">
          Apply as a vendor
        </Link>{" "}
        — pick your spot on the live layout during onboarding.
      </p>

      <details className="overflow-hidden rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Stall list (keyboard &amp; screen-reader view)</summary>
        <ul className="divide-y divide-border">
          {stallList.map((s) => {
            const st = (statuses[s.label] ?? "AVAILABLE") as StallStatus;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  Stall {s.label} · <span className="text-muted-foreground capitalize">{st.toLowerCase()}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
