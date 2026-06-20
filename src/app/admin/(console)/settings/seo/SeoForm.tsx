"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SeoSettings } from "@/server/settings/service";
import { saveSeoAction } from "./actions";

export function SeoForm({ initial }: { initial: SeoSettings }) {
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSeoAction(new FormData(e.currentTarget));
      toast.success("SEO settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Site title" hint="Leave blank to use the default title.">
        <Input name="title" defaultValue={initial.title} maxLength={120} placeholder="BDQ Social — Curated Night Market, Vadodara" />
      </Field>
      <Field label="Meta description" hint="Leave blank to use the default description.">
        <Input name="description" defaultValue={initial.description} maxLength={300} placeholder="Vadodara's premium curated lifestyle festival & night market…" />
      </Field>
      <Field label="Share image URL (Open Graph)" hint="1200×630 image shown when the site is shared.">
        <Input name="ogImage" defaultValue={initial.ogImage} maxLength={400} placeholder="https://res.cloudinary.com/…" />
      </Field>
      <Button type="submit" className="w-fit" disabled={busy}>{busy ? "Saving…" : "Save SEO"}</Button>
    </form>
  );
}
