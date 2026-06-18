"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveKycAction } from "@/app/vendor/(app)/profile/actions";
import { KycDocUploader } from "@/components/vendor/KycDocUploader";
import { RpaField, RpaInput, RpaSubmit } from "@/components/vendor/rpa-fields";
import { panOptional, fssaiOptional, gstinOptional, toUpper, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";

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
  const panField = useFieldValidation(panOptional);
  const fssaiField = useFieldValidation(fssaiOptional);
  const gstinField = useFieldValidation(gstinOptional);

  const saveNumbers = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const valid = [
      panField.validate(fd.get("pan")),
      fssaiField.validate(fd.get("fssai")),
      gstinField.validate(fd.get("gstin")),
    ].every(Boolean);
    if (!valid) return;
    setBusy(true);
    try {
      await saveKycAction(fd);
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
        <RpaField label="PAN number" error={panField.error}>
          <RpaInput
            name="pan"
            maxLength={10}
            defaultValue={kyc.pan ?? ""}
            placeholder="ABCDE1234F"
            aria-invalid={!!panField.error}
            onInput={(e) => { e.currentTarget.value = toUpper(e.currentTarget.value); panField.clear(); }}
            onBlur={(e) => panField.validate(e.currentTarget.value)}
          />
        </RpaField>
        <RpaField label="FSSAI number" error={fssaiField.error}>
          <RpaInput
            name="fssai"
            maxLength={14}
            inputMode="numeric"
            defaultValue={kyc.fssai ?? ""}
            placeholder="14-digit"
            aria-invalid={!!fssaiField.error}
            onInput={(e) => { e.currentTarget.value = digitsCapped(14)(e.currentTarget.value); fssaiField.clear(); }}
            onBlur={(e) => fssaiField.validate(e.currentTarget.value)}
          />
        </RpaField>
        <RpaField label="GSTIN" error={gstinField.error}>
          <RpaInput
            name="gstin"
            maxLength={15}
            defaultValue={kyc.gstin ?? ""}
            placeholder="If registered"
            aria-invalid={!!gstinField.error}
            onInput={(e) => { e.currentTarget.value = toUpper(e.currentTarget.value); gstinField.clear(); }}
            onBlur={(e) => gstinField.validate(e.currentTarget.value)}
          />
        </RpaField>
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
