"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EventDetailsFields } from "@/components/admin/EventDetailsFields";
import { createEventAction } from "@/app/admin/(console)/events/actions";

/** Creates the DRAFT event with the same Details fields you edit later (name, description,
 * location, dates, capacity), then lands on the tabbed editor for tickets/map/pricing/etc. */
export function NewEventForm() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createEventAction(fd);
      if (res.ok) {
        const eventId = (res.data as { id?: string } | null)?.id;
        if (eventId) {
          router.push(`/admin/events/${eventId}`);
          return;
        }
        toast.success("Event created");
      } else {
        toast.error(res.error.message ?? "Check the form and try again.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4" aria-busy={pending}>
      <EventDetailsFields />
      <Button type="submit" disabled={pending} className="w-fit">{pending ? "Creating…" : "Create event"}</Button>
    </form>
  );
}
