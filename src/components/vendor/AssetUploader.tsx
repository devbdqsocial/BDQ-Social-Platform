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
import { Button } from "@/components/ui/button";

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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium">{label}</h3>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Uploading…" : "Upload"}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {items.map((a) => (
            <div key={a.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cld(a.url, 160)} alt={`${a.kind.toLowerCase()} asset preview`} className="size-20 rounded-md border border-border object-cover" />
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onDelete(a.id)}
                className="absolute -right-2 -top-2 size-5 rounded-full bg-destructive text-xs text-destructive-foreground"
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
