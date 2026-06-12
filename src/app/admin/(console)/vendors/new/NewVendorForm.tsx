"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { createVendorAction } from "../actions";

export function NewVendorForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // Success path redirects to the new vendor (NEXT_REDIRECT propagates through the framework).
      const res = await createVendorAction(formData);
      if (res && !res.ok) toast.error(res.error.message ?? "Something went wrong. Please try again.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Vendor details</h2>
        <p className="text-sm text-muted-foreground">The vendor can later sign into the vendor portal with this number.</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" hint="They'll log in with this.">
            <Input name="phone" required placeholder="+91 98765 43210" inputMode="tel" autoComplete="off" disabled={isPending} />
          </Field>
          <Field label="Contact name" hint="Optional">
            <Input name="name" placeholder="Owner / point of contact" disabled={isPending} />
          </Field>
        </div>
        <Field label="Brand name">
          <Input name="brandName" required placeholder="The stall's display name" disabled={isPending} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" hint="Optional">
            <Input name="category" placeholder="Food, fashion, decor…" disabled={isPending} />
          </Field>
          <Field label="Instagram" hint="Optional">
            <Input name="instagram" placeholder="@handle" disabled={isPending} />
          </Field>
        </div>
        <Field label="Website" hint="Optional">
          <Input name="website" placeholder="https://…" disabled={isPending} />
        </Field>
        <Field label="Description" hint="Optional">
          <Textarea name="description" rows={2} placeholder="A line about the brand." disabled={isPending} />
        </Field>
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Creating..." : "Create vendor"}
        </Button>
      </div>
    </form>
  );
}
