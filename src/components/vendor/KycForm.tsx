"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveKycAction } from "@/app/vendor/(app)/profile/actions";
import { KycDocUploader } from "@/components/vendor/KycDocUploader";
import { BdqField, BdqInput, BdqSubmit } from "@/components/vendor/bdq-fields";
import { panOptional, fssaiOptional, gstinOptional, toUpper, digitsCapped } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";

export type KycState = {
  pan: string | null;
  fssai: string | null;
  gstin: string | null;
  docs: Record<string, { url: string; status?: string } | undefined>;
};

export function KycForm({ kyc, isFood }: { kyc: KycState; isFood: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty);
  const url = (k: string) => kyc.docs?.[k]?.url ?? null;
  const status = (k: string) => kyc.docs?.[k]?.status ?? null;
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
      setDirty(false);
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
      <form onSubmit={saveNumbers} onChange={() => setDirty(true)} className="grid gap-[var(--space-lg)] sm:grid-cols-3">
        <BdqField label="PAN number" error={panField.error}>
          <BdqInput
            name="pan"
            maxLength={10}
            defaultValue={kyc.pan ?? ""}
            placeholder="ABCDE1234F"
            aria-invalid={!!panField.error}
            onInput={(e) => { e.currentTarget.value = toUpper(e.currentTarget.value); panField.clear(); }}
            onBlur={(e) => panField.validate(e.currentTarget.value)}
          />
        </BdqField>
        <BdqField label="FSSAI number" error={fssaiField.error}>
          <BdqInput
            name="fssai"
            maxLength={14}
            inputMode="numeric"
            defaultValue={kyc.fssai ?? ""}
            placeholder="14-digit"
            aria-invalid={!!fssaiField.error}
            onInput={(e) => { e.currentTarget.value = digitsCapped(14)(e.currentTarget.value); fssaiField.clear(); }}
            onBlur={(e) => fssaiField.validate(e.currentTarget.value)}
          />
        </BdqField>
        <BdqField label="GSTIN" error={gstinField.error}>
          <BdqInput
            name="gstin"
            maxLength={15}
            defaultValue={kyc.gstin ?? ""}
            placeholder="If registered"
            aria-invalid={!!gstinField.error}
            onInput={(e) => { e.currentTarget.value = toUpper(e.currentTarget.value); gstinField.clear(); }}
            onBlur={(e) => gstinField.validate(e.currentTarget.value)}
          />
        </BdqField>
        <div className="flex flex-wrap items-center gap-[var(--space-md)] sm:col-span-3">
          <BdqSubmit accent={false} disabled={busy}>{busy ? "Saving…" : "Save numbers"}</BdqSubmit>
          {dirty && !busy && <span className="f-paragraph-small opacity-60">Unsaved changes</span>}
        </div>
      </form>

      <div className="space-y-[var(--space-md)]">
        <p className="f-paragraph-small font-bold">Upload documents</p>
        <KycDocUploader docType="pan" label="PAN card (required)" current={url("pan")} status={status("pan")} />
        {isFood && <KycDocUploader docType="fssai" label="FSSAI licence (required for food)" current={url("fssai")} status={status("fssai")} />}
        <KycDocUploader docType="gst" label="GST certificate (if registered)" current={url("gst")} status={status("gst")} />
        <KycDocUploader docType="id" label="Govt photo ID of owner" current={url("id")} status={status("id")} />
      </div>

      <button type="button" onClick={() => router.refresh()} className="bdq-btn">
        Continue
      </button>
    </div>
  );
}
