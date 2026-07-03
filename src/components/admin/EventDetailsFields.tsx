"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";

/** Shared "Details" block so Create and the Edit → Details tab are the exact same form.
 * Pass `defaults` to prefill (edit); a `slug` in `defaults` also enables the editable public-URL
 * row, which only makes sense once the event exists. */
type Defaults = {
  name?: string | null;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  capacity?: number | null;
  /** Presence enables the slug + public-link row (edit only). */
  slug?: string;
};

export function EventDetailsFields({
  defaults,
  datesNote,
}: {
  defaults?: Defaults;
  datesNote?: React.ReactNode;
}) {
  return (
    <>
      <Field label="Event name" required>
        <Input name="name" required placeholder="Lifestyle Festival / Night Market" defaultValue={defaults?.name ?? ""} />
      </Field>
      <Field label="Short description" hint="Shown on the public page — needed before you can publish.">
        <Textarea name="description" rows={2} defaultValue={defaults?.description ?? ""} placeholder="A line about the event for the public page." />
      </Field>
      <Field label="Location" hint="Venue name & city — needed before you can publish.">
        <Input name="location" defaultValue={defaults?.location ?? ""} placeholder="Venue name, City" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" required><DateTimePicker name="startsAt" required defaultValue={defaults?.startsAt} /></Field>
        <Field label="Ends" required><DateTimePicker name="endsAt" required defaultValue={defaults?.endsAt} /></Field>
      </div>
      {datesNote}
      <Field label="Capacity" hint="Optional — leave blank for no limit.">
        <Input type="number" name="capacity" min={1} defaultValue={defaults?.capacity ?? ""} />
      </Field>
      {defaults?.slug != null && <SlugField slug={defaults.slug} />}
    </>
  );
}

/** Editable public-URL slug + one-click copy of the permanent link. */
function SlugField({ slug }: { slug: string }) {
  const [value, setValue] = React.useState(slug);
  const changed = value.trim() !== slug;

  const copy = () => {
    const url = `${window.location.origin}/events/${value.trim() || slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <Field
      label="Public URL"
      hint={changed ? "Changing this breaks existing links to the old address." : "The part after /events/ — stays the same when you rename the event."}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm text-muted-foreground">/events/</span>
        <Input
          name="slug"
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          className="flex-1"
          aria-label="Public URL slug"
        />
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy className="size-4" /> Copy link
        </Button>
      </div>
    </Field>
  );
}
