"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteEventAction } from "./actions";

export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [confirming, setConfirming] = React.useState(false);
  const [value, setValue] = React.useState("");
  const match = value.trim() === eventName.trim();

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" size="sm" onClick={() => setConfirming(true)}>
        Delete event
      </Button>
    );
  }

  return (
    <form action={deleteEventAction} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <p className="text-sm text-muted-foreground">
        This permanently deletes the event and all its tickets, orders, bookings, and payments. This cannot be undone.
        Type <span className="font-medium text-foreground">{eventName}</span> to confirm.
      </p>
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={eventName} autoFocus />
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={!match}>Delete permanently</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setConfirming(false); setValue(""); }}>Cancel</Button>
      </div>
    </form>
  );
}
