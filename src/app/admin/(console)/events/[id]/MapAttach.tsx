"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { attachMapAction } from "@/app/admin/(console)/venue/maps/actions";

interface MapRow { id: string; name: string }

export function MapAttach({ eventId, maps, currentMapId }: { eventId: string; maps: MapRow[]; currentMapId: string | null }) {
  const router = useRouter();
  const [mapId, setMapId] = useState(currentMapId ?? maps[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const current = maps.find((m) => m.id === currentMapId);

  const attach = () => {
    if (!mapId) return;
    if (!confirm("Attach this map to the event? It copies the map's layout into the event's stalls (already-booked stalls are kept).")) return;
    start(async () => {
      try { await attachMapAction(eventId, mapId); setMsg("Map attached — stalls updated."); router.refresh(); }
      catch (e) { setMsg(e instanceof Error ? e.message : "Couldn't attach the map"); }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Linked map: <span className="font-medium text-foreground">{current?.name ?? "none"}</span>. Pick a reusable map to copy its layout onto this event, or{" "}
        <Link href={`/admin/events/${eventId}/map`} className="text-primary hover:underline">edit this event&apos;s layout directly</Link>.
      </p>
      {maps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No maps yet — build one under <Link href="/admin/venue/maps" className="text-primary hover:underline">Venue → Maps</Link>.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={mapId} onChange={(e) => setMapId(e.target.value)} className="w-56">
            {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Button type="button" size="sm" disabled={pending} onClick={attach}>Attach map</Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      )}
    </div>
  );
}
