"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGalleryUploadSignatureAction, addGalleryPhotoAction } from "@/app/admin/(console)/content/gallery/actions";

const MAX_BYTES = 10 * 1024 * 1024; // §6.2: ≤10MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Multi-file signed Cloudinary upload for the event gallery (admin-portal §6.2). */
export function GalleryUploader() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    let added = 0;
    try {
      for (const file of files) {
        if (!OK_TYPES.includes(file.type) || file.size > MAX_BYTES) {
          toast.error(`${file.name}: use jpg/png/webp under 10MB`);
          continue;
        }
        const sig = await getGalleryUploadSignatureAction();
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
        await addGalleryPhotoAction(json.secure_url, json.public_id);
        added++;
      }
      if (added > 0) {
        toast.success(`Added ${added} photo${added > 1 ? "s" : ""}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
        <Upload className="size-4" /> {busy ? "Uploading…" : "Upload photos"}
      </Button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onPick} />
    </div>
  );
}
