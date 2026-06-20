"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OrgSettings } from "@/server/settings/service";
import { saveOrgAction } from "./actions";

export function OrgForm({ initial }: { initial: OrgSettings }) {
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveOrgAction(new FormData(e.currentTarget));
      toast.success("Organization details saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Company name" className="sm:col-span-2">
        <Input name="legalName" defaultValue={initial.legalName} placeholder="BDQ Social LLP" />
      </Field>
      <Field label="Registered address" className="sm:col-span-2">
        <Input name="address" defaultValue={initial.address} placeholder="Street, city, state, PIN" />
      </Field>
      <Field label="GSTIN" hint="For records only — no tax is applied.">
        <Input name="gstin" defaultValue={initial.gstin} placeholder="24ABCDE1234F1Z5" />
      </Field>
      <Field label="PAN">
        <Input name="pan" defaultValue={initial.pan} placeholder="ABCDE1234F" />
      </Field>
      <Field label="Support email">
        <Input name="supportEmail" type="email" defaultValue={initial.supportEmail} placeholder="support@bdqsocial.com" />
      </Field>
      <Field label="Support phone">
        <Input name="supportPhone" defaultValue={initial.supportPhone} placeholder="+91…" />
      </Field>
      <Field label="Website" className="sm:col-span-2">
        <Input name="website" defaultValue={initial.website} placeholder="https://bdqsocial.com" />
      </Field>
      <Button type="submit" className="w-fit sm:col-span-2" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
