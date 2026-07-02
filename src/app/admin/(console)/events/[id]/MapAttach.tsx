"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { attachMapAction } from "@/app/admin/(console)/venue/maps/actions";

/** Per-map summary computed server-side (from the map's layoutJson vs this event's data). */
export interface MapSummary {
  id: string;
  name: string;
  stallCount: number;
  /** stalls whose type tag matches one of this event's stall types by name */
  matchedTypeCount: number;
  /** labels of this event's booked/held stalls that the incoming map does NOT contain */
  missingActiveLabels: string[];
}

export function MapAttach({
  eventId,
  maps,
  currentMapId,
  activeStallCount,
}: {
  eventId: string;
  maps: MapSummary[];
  currentMapId: string | null;
  activeStallCount: number;
}) {
  const router = useRouter();
  const [mapId, setMapId] = useState(currentMapId ?? maps[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const current = maps.find((m) => m.id === currentMapId);
  const selected = maps.find((m) => m.id === mapId);
  const missing = selected?.missingActiveLabels ?? [];
  const needsAck = missing.length > 0;

  const attach = () => {
    if (!mapId) return;
    start(async () => {
      try {
        await attachMapAction(eventId, mapId);
        setMsg("Map attached — stalls updated.");
        setOpen(false);
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Couldn't attach the map");
        setOpen(false);
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Linked map: <span className="font-medium text-foreground">{current?.name ?? "none"}</span>. Pick a map from the library to copy its layout onto this event.
      </p>
      {maps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No maps yet — build one under <Link href="/admin/venue/maps" className="text-primary hover:underline">Venue → Map Library</Link>, or save this event&apos;s layout to the library from the designer.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={mapId} onChange={(e) => setMapId(e.target.value)} className="w-64">
            {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setAcknowledged(false); }}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={!mapId}>Attach map…</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Attach “{selected?.name}” to this event?</DialogTitle>
                <DialogDescription>Here&apos;s what will happen:</DialogDescription>
              </DialogHeader>
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                <li>Copies <span className="font-medium">{selected?.stallCount ?? 0} stalls</span> and the venue layout onto this event.</li>
                <li>
                  {selected && selected.matchedTypeCount > 0
                    ? <><span className="font-medium">{selected.matchedTypeCount}</span> stall{selected.matchedTypeCount === 1 ? "" : "s"} match your stall types by name and will use those prices — the rest need pricing in the designer.</>
                    : <>No stalls match your stall types by name — price them via types or per stall in the designer.</>}
                </li>
                {activeStallCount > 0 && missing.length === 0 && (
                  <li><span className="font-medium">{activeStallCount}</span> stall{activeStallCount === 1 ? "" : "s"} with active bookings are kept as-is.</li>
                )}
              </ul>
              {needsAck && (
                <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                  <p>
                    ⚠ This map has no stall{missing.length === 1 ? "" : "s"} labelled <span className="font-medium">{missing.slice(0, 6).join(", ")}{missing.length > 6 ? "…" : ""}</span>,
                    but those stalls have active bookings here. They keep their current positions, which may overlap the new layout — check the designer after attaching.
                  </p>
                  <label className="flex items-center gap-2 font-medium">
                    <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="size-4 accent-primary" />
                    I understand — attach anyway
                  </label>
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
                <Button size="sm" onClick={attach} disabled={pending || (needsAck && !acknowledged)}>
                  {pending ? "Attaching…" : "Attach map"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      )}
    </div>
  );
}
