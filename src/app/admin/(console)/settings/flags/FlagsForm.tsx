"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveFlagsAction } from "./actions";

type Flag = { key: string; label: string; description: string; enabled: boolean };

export function FlagsForm({ flags }: { flags: Flag[] }) {
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveFlagsAction(new FormData(e.currentTarget));
      toast.success("Feature flags saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {flags.map((f) => (
        <label key={f.key} className="flex items-start gap-3">
          <input type="checkbox" name={f.key} defaultChecked={f.enabled} className="mt-1 size-4 accent-primary" />
          <span>
            <span className="block text-sm font-medium">{f.label}</span>
            <span className="text-xs text-muted-foreground">{f.description}</span>
          </span>
        </label>
      ))}
      <Button type="submit" className="w-fit" disabled={busy}>{busy ? "Saving…" : "Save flags"}</Button>
    </form>
  );
}
