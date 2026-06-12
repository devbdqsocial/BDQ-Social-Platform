import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { PageHeader } from "@/components/ui/page-header";
import { ActionForm } from "@/components/admin/action-form";
import { createEventAction } from "../actions";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage() {
  await requireAdminRole();

  return (
    <div className="space-y-6">
      <PageHeader title="Create event" description="Add the basics now — tickets, schedule, and the event layout come next." />

      <ActionForm action={createEventAction} success="Event created" resetOnSuccess className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Add an event</h2>
          <p className="text-sm text-muted-foreground">You can add ticket types and prices on the next screen.</p>
        </div>
        <div className="grid gap-4">
          <Field label="Event name">
            <Input name="name" required placeholder="Lifestyle Festival / Night Market" />
          </Field>
          <Field label="Short description">
            <Textarea name="description" rows={2} placeholder="A line about the event for the public page." />
          </Field>
          <Field label="Location">
            <Input name="location" placeholder="Venue name, City" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts">
              <DateTimePicker name="startsAt" required />
            </Field>
            <Field label="Ends">
              <DateTimePicker name="endsAt" required />
            </Field>
          </div>
          <Field label="Capacity" hint="Optional — leave blank for no limit.">
            <Input type="number" name="capacity" min={1} />
          </Field>
          <Button type="submit" className="w-fit">Add event</Button>
        </div>
      </ActionForm>
    </div>
  );
}
