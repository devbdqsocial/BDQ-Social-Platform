"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea, Select } from "@/components/ui/input";
import { ARTIST_TYPES } from "@/server/schemas";
import { createArtistAction, updateArtistAction } from "./actions";

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export interface ArtistInitial {
  id?: string;
  stageName?: string;
  realName?: string | null;
  type?: string;
  genre?: string | null;
  city?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
  askingFeePaise?: number | null;
  bio?: string | null;
  notes?: string | null;
}

export function ArtistForm({ initial }: { initial?: ArtistInitial }) {
  const editing = !!initial?.id;
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = editing ? await updateArtistAction(fd) : await createArtistAction(fd);
      if (res && !res.ok) toast.error(res.error.message ?? "Something went wrong. Please try again.");
      else if (editing) toast.success("Artist updated.");
      // create success redirects (NEXT_REDIRECT propagates).
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {editing && <input type="hidden" name="id" value={initial!.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Stage name"><Input name="stageName" required defaultValue={initial?.stageName ?? ""} disabled={isPending} /></Field>
        <Field label="Real name" hint="Optional"><Input name="realName" defaultValue={initial?.realName ?? ""} disabled={isPending} /></Field>
        <Field label="Type">
          <Select name="type" defaultValue={initial?.type ?? "MUSICIAN"} disabled={isPending}>
            {ARTIST_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </Select>
        </Field>
        <Field label="Genre" hint="Optional"><Input name="genre" defaultValue={initial?.genre ?? ""} placeholder="Indie, techno, fusion…" disabled={isPending} /></Field>
        <Field label="City" hint="Optional"><Input name="city" defaultValue={initial?.city ?? ""} disabled={isPending} /></Field>
        <Field label="Rate card (₹)" hint="Asking fee — negotiable per booking">
          <Input name="askingFeeRupees" type="number" min={0} step={1} defaultValue={initial?.askingFeePaise != null ? String(initial.askingFeePaise / 100) : ""} disabled={isPending} />
        </Field>
        <Field label="Phone" hint="Optional"><Input name="phone" defaultValue={initial?.phone ?? ""} disabled={isPending} /></Field>
        <Field label="WhatsApp" hint="Optional"><Input name="whatsapp" defaultValue={initial?.whatsapp ?? ""} disabled={isPending} /></Field>
        <Field label="Email" hint="Optional"><Input name="email" type="email" defaultValue={initial?.email ?? ""} disabled={isPending} /></Field>
        <Field label="Instagram" hint="Optional"><Input name="instagram" defaultValue={initial?.instagram ?? ""} placeholder="@handle" disabled={isPending} /></Field>
      </div>
      <Field label="Bio" hint="Optional"><Textarea name="bio" rows={3} defaultValue={initial?.bio ?? ""} disabled={isPending} /></Field>
      <Field label="Internal notes" hint="Not shown publicly"><Textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} disabled={isPending} /></Field>
      <Button type="submit" disabled={isPending} className="w-fit">{isPending ? "Saving…" : editing ? "Save changes" : "Create artist"}</Button>
    </form>
  );
}
