"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveKycAction } from "@/app/vendor/(app)/profile/actions";
import { KycDocUploader } from "@/components/vendor/KycDocUploader";
import { RpaField, RpaInput, RpaSubmit } from "@/components/vendor/rpa-fields";

export type KycState = {
  pan: string | null;
  fssai: string | null;
  gstin: string | null;
  docs: Record<string, { url: string } | undefined>;
};

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
    <div className="space-y-[var(--space-2xl)]">
      <p className="f-paragraph-small opacity-70">Used only to verify you — never for tax or shared with anyone.</p>
      <form onSubmit={saveNumbers} className="grid gap-[var(--space-lg)] sm:grid-cols-3">
        <RpaField label="PAN number"><RpaInput name="pan" maxLength={10} defaultValue={kyc.pan ?? ""} placeholder="ABCDE1234F" /></RpaField>
        <RpaField label="FSSAI number"><RpaInput name="fssai" defaultValue={kyc.fssai ?? ""} placeholder="14-digit" /></RpaField>
        <RpaField label="GSTIN"><RpaInput name="gstin" defaultValue={kyc.gstin ?? ""} placeholder="If registered" /></RpaField>
        <div className="sm:col-span-3">
          <RpaSubmit accent={false} disabled={busy}>{busy ? "Saving…" : "Save numbers"}</RpaSubmit>
        </div>
      </form>

      <div className="space-y-[var(--space-md)]">
        <p className="f-paragraph-small font-bold">Upload documents</p>
        <KycDocUploader docType="pan" label="PAN card (required)" current={url("pan")} />
        {isFood && <KycDocUploader docType="fssai" label="FSSAI licence (required for food)" current={url("fssai")} />}
        <KycDocUploader docType="gst" label="GST certificate (if registered)" current={url("gst")} />
        <KycDocUploader docType="id" label="Govt photo ID of owner" current={url("id")} />
      </div>

      <button type="button" onClick={() => router.refresh()} data-cursor className="btn btn--accent">
        <span className="btn__text">Continue</span>
      </button>
    </div>
  );
}
