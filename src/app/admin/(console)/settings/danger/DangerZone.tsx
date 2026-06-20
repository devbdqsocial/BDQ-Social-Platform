"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dangerArchiveEvent, dangerDeleteEvent } from "./actions";

type Ev = { id: string; name: string; status: string };

export function DangerZone({ events }: { events: Ev[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Ev | null>(null);
  const [confirm, setConfirm] = useState("");

  const archive = async (e: Ev) => {
    setBusy(e.id);
    try {
      const fd = new FormData();
      fd.set("eventId", e.id);
      await dangerArchiveEvent(fd);
      toast.success(`Archived “${e.name}”.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive.");
    } finally {
      setBusy(null);
    }
  };

  const del = async () => {
    if (!deleting) return;
    setBusy(deleting.id);
    try {
      const fd = new FormData();
      fd.set("eventId", deleting.id);
      fd.set("name", deleting.name);
      fd.set("confirm", confirm);
      await dangerDeleteEvent(fd);
      toast.success(`Deleted “${deleting.name}”.`);
      setDeleting(null);
      setConfirm("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusy(null);
    }
  };

  if (events.length === 0) return <p className="text-sm text-muted-foreground">No events.</p>;

  return (
    <div className="grid gap-3">
      {events.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">{e.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{e.status}</p>
          </div>
          <div className="flex gap-2">
            {e.status !== "ARCHIVED" && (
              <Button size="sm" variant="outline" disabled={busy === e.id} onClick={() => archive(e)}>Archive</Button>
            )}
            <Button size="sm" variant="outline" className="text-destructive" disabled={busy === e.id} onClick={() => { setDeleting(e); setConfirm(""); }}>
              Delete
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o) { setDeleting(null); setConfirm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the event and all its orders, bookings, tickets, and payments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Field label={`Type "${deleting?.name}" to confirm`}>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </Field>
          <Button
            variant="destructive"
            disabled={busy !== null || confirm.trim() !== (deleting?.name ?? "").trim()}
            onClick={del}
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
