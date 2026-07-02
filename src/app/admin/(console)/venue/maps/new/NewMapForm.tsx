"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea, Select } from "@/components/ui/input";
import { createMapAction } from "../actions";

export function NewMapForm() {
  const [isPending, startTransition] = useTransition();
  const [plotKind, setPlotKind] = useState<"RECT" | "L" | "BLANK">("RECT");

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
        <Field label="Plot shape" hint="The real ground you have — everything is placed inside it. You can reshape it point-by-point in the designer." className="sm:col-span-2">
          <Select name="plotKind" value={plotKind} onChange={(e) => setPlotKind(e.target.value as typeof plotKind)} disabled={isPending}>
            <option value="RECT">Rectangle</option>
            <option value="L">L-shape (rectangle with a corner cut)</option>
            <option value="BLANK">Start blank — draw or trace the plot in the designer</option>
          </Select>
        </Field>
        <Field label={plotKind === "BLANK" ? "Canvas width" : "Plot width"}>
          <Input type="number" name="width" min={1} required placeholder="400" disabled={isPending} />
        </Field>
        <Field label={plotKind === "BLANK" ? "Canvas length" : "Plot depth"}>
          <Input type="number" name="length" min={1} required placeholder="250" disabled={isPending} />
        </Field>
        {plotKind === "L" && (
          <>
            <Field label="Cut width" hint="Size of the missing corner (bottom-right)">
              <Input type="number" name="cutWidth" min={1} placeholder="100" disabled={isPending} />
            </Field>
            <Field label="Cut depth">
              <Input type="number" name="cutDepth" min={1} placeholder="80" disabled={isPending} />
            </Field>
          </>
        )}
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
