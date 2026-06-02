"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { stallsToRenderLayout, type StallLike } from "@/lib/map/normalize";
import { type StallStatus } from "@/lib/stall-colors";
import { Button } from "@/components/ui/button";
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

interface Props {
  stalls: StallInput[];
  /** vendor portal passes a server action; public page falls back to the API route */
  holdAction?: (stallId: string) => Promise<{ ok: boolean; unauthorized?: boolean }>;
  loginPath?: string;
}

export function BookingFloorPlan({ stalls, holdAction, loginPath = "/login" }: Props) {
  const router = useRouter();
  const idByLabel = useMemo(
    () => Object.fromEntries(stalls.map((s) => [s.label, s.id])),
    [stalls],
  );
  const { layout } = useMemo(() => stallsToRenderLayout(stalls), [stalls]);

  const [statuses, setStatuses] = useState<Record<string, StallStatus>>(() =>
    Object.fromEntries(
      stalls.filter((s) => s.kind !== "INFRA").map((s) => [s.label, s.status as StallStatus]),
    ),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (label: string) => {
    if ((statuses[label] ?? "AVAILABLE") !== "AVAILABLE") return; // only AVAILABLE is selectable
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const hold = async (labels: string[]) => {
    if (!labels.length) return;
    setBusy(true);
    setMsg(null);
    const held: string[] = [];
    const taken: string[] = [];
    for (const label of labels) {
      const id = idByLabel[label];
      let result: { ok: boolean; unauthorized?: boolean };
      if (holdAction) {
        result = await holdAction(id);
      } else {
        const res = await fetch(`/api/stalls/${id}/hold`, { method: "POST" });
        result = { ok: res.ok, unauthorized: res.status === 401 };
      }
      if (result.unauthorized) {
        router.push(loginPath);
        return;
      }
      (result.ok ? held : taken).push(label);
    }
    setStatuses((prev) => {
      const next = { ...prev };
      held.forEach((l) => (next[l] = "HELD"));
      taken.forEach((l) => (next[l] = "BOOKED"));
      return next;
    });
    setSelected(new Set());
    setBusy(false);
    setMsg(
      held.length
        ? `Held ${held.length} stall(s) for 10 minutes.${taken.length ? ` ${taken.length} were just taken.` : ""}`
        : "Those stalls were just taken.",
    );
  };

  const stallList = stalls.filter((s) => s.kind !== "INFRA");

  return (
    <div className="space-y-4">
      <StallLegend />
      <div aria-hidden="true">
        <MapCanvas layout={layout} statuses={statuses} selected={selected} onSelect={toggle} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!selected.size || busy} onClick={() => hold([...selected])}>
          {busy ? "Holding…" : `Hold selected (${selected.size})`}
        </Button>
        <span role="status" aria-live="polite" className="text-sm text-muted-foreground">{msg}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Log in to hold a stall (10-min lock). Payment + booking confirmation come next.
      </p>

      <details className="overflow-hidden rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Stall list (keyboard &amp; screen-reader view)</summary>
        <ul className="divide-y divide-border">
          {stallList.map((s) => {
            const st = (statuses[s.label] ?? "AVAILABLE") as StallStatus;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>Stall {s.label} · <span className="text-muted-foreground capitalize">{st.toLowerCase()}</span></span>
                {st === "AVAILABLE" && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => hold([s.label])}>
                    Hold stall {s.label}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
