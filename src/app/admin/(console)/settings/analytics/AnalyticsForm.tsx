"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AnalyticsSettings } from "@/server/settings/service";
import { saveAnalyticsAction } from "./actions";

export function AnalyticsForm({ initial }: { initial: AnalyticsSettings }) {
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveAnalyticsAction(new FormData(e.currentTarget));
      toast.success("Analytics IDs saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Google Analytics 4" hint="Measurement ID, e.g. G-XXXXXXXXXX.">
        <Input name="ga4" defaultValue={initial.ga4} maxLength={40} placeholder="G-XXXXXXXXXX" />
      </Field>
      <Field label="Meta (Facebook) Pixel" hint="Numeric pixel ID.">
        <Input name="metaPixel" defaultValue={initial.metaPixel} maxLength={40} placeholder="123456789012345" />
      </Field>
      <Field label="Microsoft Clarity" hint="Clarity project ID.">
        <Input name="clarity" defaultValue={initial.clarity} maxLength={40} placeholder="abcdefghij" />
      </Field>
      <Button type="submit" className="w-fit" disabled={busy}>{busy ? "Saving…" : "Save analytics"}</Button>
    </form>
  );
}
