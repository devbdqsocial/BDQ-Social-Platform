"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createEventAction } from "@/app/admin/(console)/events/actions";

/** Wizard step 1 (Basics): creates the DRAFT event then advances to the Tickets step. */
export function EventWizardBasics() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createEventAction(fd);
      if (res.ok) {
        const id = (res.data as { id?: string } | null)?.id;
        if (id) {
          router.push(`/admin/events/${id}/setup?step=tickets`);
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
      <Field label="Event name"><Input name="name" required placeholder="Lifestyle Festival / Night Market" /></Field>
      <Field label="Short description"><Textarea name="description" rows={2} placeholder="A line about the event for the public page." /></Field>
      <Field label="Location"><Input name="location" placeholder="Venue name, City" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts"><DateTimePicker name="startsAt" required /></Field>
        <Field label="Ends"><DateTimePicker name="endsAt" required /></Field>
      </div>
      <Field label="Capacity" hint="Optional — leave blank for no limit."><Input type="number" name="capacity" min={1} /></Field>
      <Button type="submit" disabled={pending} className="w-fit">{pending ? "Creating…" : "Save & continue"}</Button>
    </form>
  );
}
