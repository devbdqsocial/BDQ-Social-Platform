"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Lead capture form → POST /api/leads. */
export function LeadForm({ vendorProfileId }: { vendorProfileId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!data.get("phone") && !data.get("email")) {
      setState("error");
      return;
    }
    setState("busy");
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendorProfileId,
          name: data.get("name") || undefined,
          phone: data.get("phone") || undefined,
          email: data.get("email") || undefined,
          consent: true,
        }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return <p className="rounded-lg bg-success/10 p-4 text-sm font-medium text-success">Thanks! They&apos;ll be in touch.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Your name">
        <Input name="name" autoComplete="name" />
      </Field>
      <Field label="Phone">
        <Input name="phone" type="tel" autoComplete="tel" inputMode="tel" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" />
      </Field>
      <p className="text-xs text-muted-foreground">By sharing your details you agree to be contacted by this brand.</p>
      {state === "error" && <p className="text-sm text-destructive">Please add a phone or email.</p>}
      <Button type="submit" disabled={state === "busy"} className="w-full">{state === "busy" ? "Sending…" : "Share my details"}</Button>
    </form>
  );
}
