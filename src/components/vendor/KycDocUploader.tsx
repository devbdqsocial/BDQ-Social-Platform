"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAllowedImage } from "@/lib/assets";
import { getKycUploadSignatureAction, saveKycDocAction, deleteKycDocAction } from "@/app/vendor/(app)/profile/actions";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {current ? (
          <a href={current} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View uploaded</a>
        ) : (
          <p className="text-xs text-muted-foreground">Not uploaded</p>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {current && (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>Remove</Button>
        )}
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Uploading…" : current ? "Replace" : "Upload"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
    </div>
  );
}
