"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { saveToLibraryAction } from "./actions";

/** "Save to library" — snapshot this event's layout as a reusable map (replaces the old
 * save-as-template flow). Geometry only; prices/types/statuses stay with the event. */
export function SaveToLibrary({ eventId, linkedMap }: { eventId: string; linkedMap: { id: string; name: string } | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "update">(linkedMap ? "update" : "new");
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    start(async () => {
      try {
        await saveToLibraryAction(eventId, mode === "update" && linkedMap ? { mapId: linkedMap.id } : { name });
        setOpen(false);
        setName("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save to the library");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Save to library</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save layout to the map library</DialogTitle>
          <DialogDescription>
            Geometry only — prices, stall types and stall statuses stay with this event. The saved map can be attached to any event.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          {linkedMap && (
            <label className="flex items-center gap-2">
              <input type="radio" name="libraryMode" checked={mode === "update"} onChange={() => setMode("update")} className="accent-primary" />
              Update linked map <span className="font-medium">{linkedMap.name}</span>
            </label>
          )}
          <label className="flex items-center gap-2">
            <input type="radio" name="libraryMode" checked={mode === "new"} onChange={() => setMode("new")} className="accent-primary" />
            Save as a new map
          </label>
          {mode === "new" && (
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Map name — e.g. Aarush Lawn 400×250" autoFocus />
          )}
          {error && <p className="text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
          <Button size="sm" onClick={save} disabled={pending || (mode === "new" && name.trim().length < 2)}>
            {pending ? "Saving…" : "Save to library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
