"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea, Select } from "@/components/ui/input";
import { createMapAction } from "../actions";

export function NewMapForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createMapAction(formData);
      } catch (err) {
        if (err instanceof Error) {
          toast.error(err.message);
        } else {
          toast.error("An unexpected error occurred.");
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Map name" className="sm:col-span-2">
          <Input name="name" required placeholder="Main Exhibition Grounds — Section A" disabled={isPending} />
        </Field>
        <Field label="Description" hint="Optional" className="sm:col-span-2">
          <Textarea name="description" rows={2} placeholder="Notes about this layout." disabled={isPending} />
        </Field>
        <Field label="Location" hint="Optional">
          <Input name="location" placeholder="Venue, City" disabled={isPending} />
        </Field>
        <Field label="Unit">
          <Select name="unit" defaultValue="FT" disabled={isPending}>
            <option value="FT">Feet</option>
            <option value="M">Meters</option>
          </Select>
        </Field>
        <Field label="Width">
          <Input type="number" name="width" min={1} required placeholder="400" disabled={isPending} />
        </Field>
        <Field label="Length">
          <Input type="number" name="length" min={1} required placeholder="250" disabled={isPending} />
        </Field>
        <Field label="Grid size (ft)">
          <Select name="gridFt" defaultValue="5" disabled={isPending}>
            {[1, 2, 5, 10].map((g) => (
              <option key={g} value={g}>
                {g} ft
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={isPending} className="w-fit sm:col-span-2">
          {isPending ? "Creating..." : "Create map"}
        </Button>
      </div>
    </form>
  );
}
