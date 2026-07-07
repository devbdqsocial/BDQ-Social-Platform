"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAllowedImage, type UploadableAssetKind } from "@/lib/assets";
import { cld } from "@/lib/cloudinary-url";
import {
  deleteAssetAction,
  getUploadSignatureAction,
  saveAssetAction,
} from "@/app/vendor/(app)/profile/actions";

interface Asset {
  id: string;
  url: string;
  kind: string;
}

export function AssetUploader({
  kind,
  label,
  assets,
}: {
  kind: UploadableAssetKind;
  label: string;
  assets: Asset[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const items = assets.filter((a) => a.kind === kind);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (!isAllowedImage(file.type, file.size)) {
      setErr("Pick an image under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const sig = await getUploadSignatureAction(kind);
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
      await saveAssetAction(kind, json.secure_url, json.public_id);
      toast.success("Asset uploaded");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (id: string) => {
    await deleteAssetAction(id);
    router.refresh();
  };

  return (
    <div className="space-y-[var(--space-md)]">
      <div className="flex flex-wrap items-center gap-[var(--space-md)]">
        <h3 className="f-paragraph-small min-w-0 font-bold">{label}</h3>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="f-paragraph-small min-h-9 shrink-0 rounded-full border px-[var(--space-md)] py-[var(--space-xs)] font-bold transition-colors disabled:opacity-50"
          style={{ borderColor: "color-mix(in srgb, currentColor 35%, transparent)" }}
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      {err && <p className="f-paragraph-small font-bold" style={{ color: "var(--red)" }}>{err}</p>}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-[var(--space-md)]">
          {items.map((a) => (
            <div key={a.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cld(a.url, 160)} alt={`${a.kind.toLowerCase()} asset preview`} className="size-20 rounded-[var(--radius-md)] object-cover" style={{ border: "1px solid color-mix(in srgb, currentColor 20%, transparent)" }} />
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onDelete(a.id)}
                className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full text-xs text-white"
                style={{ background: "var(--red)" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
