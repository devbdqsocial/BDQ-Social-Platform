"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { deleteEventDayAction } from "./actions";

/** Remove-day with an orphan guard: schedule items on the day are kept but detached (eventDayId
 * nulled), so warn how many before confirming. */
export function DeleteDayButton({ eventId, dayId, itemCount }: { eventId: string; dayId: string; itemCount: number }) {
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>
        Remove day
      </Button>
    );
  }

  return (
    <form action={deleteEventDayAction} className="space-y-2">
      <input type="hidden" name="id" value={dayId} />
      <input type="hidden" name="eventId" value={eventId} />
      <p className="text-xs text-muted-foreground">
        {itemCount > 0
          ? `${itemCount} schedule item${itemCount === 1 ? "" : "s"} on this day will be kept but unassigned from it.`
          : "Remove this day?"}
      </p>
      <div className="flex gap-2">
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">Remove day</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    </form>
  );
}
