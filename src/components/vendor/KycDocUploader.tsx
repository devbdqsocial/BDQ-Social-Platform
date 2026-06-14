"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAllowedImage } from "@/lib/assets";
import { getKycUploadSignatureAction, saveKycDocAction, deleteKycDocAction } from "@/app/vendor/(app)/profile/actions";

export function KycDocUploader({ docType, label, current }: { docType: string; label: string; current: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (!isAllowedImage(file.type, file.size)) {
      setErr("Upload a clear photo/scan (image under 5 MB).");
      return;
    }
    setBusy(true);
    try {
      const sig = await getKycUploadSignatureAction(docType);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      fd.append("allowed_formats", sig.allowedFormats);
      const res = await fetch(sig.uploadUrl, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { secure_url: string; public_id: string };
      await saveKycDocAction(docType, json.secure_url, json.public_id);
      toast.success(`${label} uploaded`);
      router.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Upload failed";
      setErr(m);
      toast.error(m);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async () => {
    await deleteKycDocAction(docType);
    router.refresh();
  };

  const pill = "f-paragraph-small rounded-full border px-[var(--space-md)] py-[var(--space-xs)] font-bold transition-colors disabled:opacity-50";
  const pillStyle = { borderColor: "color-mix(in srgb, currentColor 35%, transparent)" } as const;
  return (
    <div
      className="flex items-center justify-between gap-[var(--space-md)] rounded-[var(--radius-md)] p-[var(--space-md)]"
      style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}
    >
      <div className="min-w-0">
        <p className="f-paragraph-small font-bold">{label}</p>
        {current ? (
          <a href={current} target="_blank" rel="noreferrer" className="f-paragraph-small font-bold underline underline-offset-2" style={{ color: "var(--light-blue)" }}>View uploaded</a>
        ) : (
          <p className="f-paragraph-small opacity-60">Not uploaded</p>
        )}
        {err && <p className="f-paragraph-small font-bold" style={{ color: "var(--red)" }}>{err}</p>}
      </div>
      <div className="flex shrink-0 gap-[var(--space-sm)]">
        {current && (
          <button type="button" onClick={onDelete} className="f-paragraph-small rounded-full px-[var(--space-md)] py-[var(--space-xs)] font-bold opacity-70 transition-opacity hover:opacity-100">Remove</button>
        )}
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={pill} style={pillStyle}>
          {busy ? "Uploading…" : current ? "Replace" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
    </div>
  );
}
