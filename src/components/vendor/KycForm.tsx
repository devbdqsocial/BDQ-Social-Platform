"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveKycAction } from "@/app/vendor/(app)/profile/actions";
import { KycDocUploader } from "@/components/vendor/KycDocUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type KycState = {
  pan: string | null;
  fssai: string | null;
  gstin: string | null;
  docs: Record<string, { url: string } | undefined>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function KycForm({ kyc, isFood }: { kyc: KycState; isFood: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const url = (k: string) => kyc.docs?.[k]?.url ?? null;

  const saveNumbers = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveKycAction(new FormData(e.currentTarget));
      toast.success("Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={saveNumbers} className="grid gap-4 sm:grid-cols-3">
        <Field label="PAN number"><Input name="pan" maxLength={10} defaultValue={kyc.pan ?? ""} placeholder="ABCDE1234F" /></Field>
        <Field label="FSSAI number"><Input name="fssai" defaultValue={kyc.fssai ?? ""} placeholder="14-digit" /></Field>
        <Field label="GSTIN"><Input name="gstin" defaultValue={kyc.gstin ?? ""} placeholder="If registered" /></Field>
        <div className="sm:col-span-3">
          <Button type="submit" variant="outline" disabled={busy}>{busy ? "Saving…" : "Save numbers"}</Button>
        </div>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-medium">Upload documents</p>
        <KycDocUploader docType="pan" label="PAN card (required)" current={url("pan")} />
        {isFood && <KycDocUploader docType="fssai" label="FSSAI licence (required for food)" current={url("fssai")} />}
        <KycDocUploader docType="gst" label="GST certificate (if registered)" current={url("gst")} />
        <KycDocUploader docType="id" label="Govt photo ID of owner" current={url("id")} />
      </div>

      <Button onClick={() => router.refresh()}>Continue</Button>
    </div>
  );
}
