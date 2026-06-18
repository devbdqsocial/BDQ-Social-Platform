"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { phone10, email as emailSchema, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";

/** Lead capture form → POST /api/leads. */
export function LeadForm({ vendorProfileId }: { vendorProfileId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [phone, setPhone] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const phoneField = useFieldValidation(phone10);
  const emailField = useFieldValidation(emailSchema);
  const [bothError, setBothError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = ((new FormData(e.currentTarget).get("name") as string) || "").trim();
    if (!phone && !emailVal) {
      setBothError("Please add a phone or email.");
      return;
    }
    setBothError(null);
    const phoneOk = phone ? phoneField.validate(phone) : true;
    const emailOk = emailVal ? emailField.validate(emailVal) : true;
    if (!phoneOk || !emailOk) return;

    setState("busy");
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendorProfileId,
          name: name || undefined,
          phone: phone || undefined,
          email: emailVal || undefined,
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
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Your name">
        <Input name="name" autoComplete="name" maxLength={120} />
      </Field>
      <Field label="Phone" error={phoneField.error}>
        <Input
          name="phone"
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          aria-invalid={!!phoneField.error}
          onChange={(e) => {
            setPhone(digitsCapped(10)(e.target.value));
            phoneField.clear();
          }}
          onBlur={() => phone && phoneField.validate(phone)}
        />
      </Field>
      <Field label="Email" error={emailField.error}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={160}
          value={emailVal}
          aria-invalid={!!emailField.error}
          onChange={(e) => {
            setEmailVal(e.target.value);
            emailField.clear();
          }}
          onBlur={() => emailVal && emailField.validate(emailVal)}
        />
      </Field>
      <p className="text-xs text-muted-foreground">By sharing your details you agree to be contacted by this brand.</p>
      {bothError && <p className="text-sm text-destructive">{bothError}</p>}
      {state === "error" && <p className="text-sm text-destructive">Something went wrong — please try again.</p>}
      <Button type="submit" disabled={state === "busy"} className="w-full">{state === "busy" ? "Sending…" : "Share my details"}</Button>
    </form>
  );
}
