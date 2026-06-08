"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { getReceiptSignatureAction } from "./actions";
import { Button } from "@/components/ui/button";

/** Direct-to-Cloudinary receipt upload; writes the secure_url into a hidden field inside the form. */
export function ReceiptUploader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Pick an image under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const sig = await getReceiptSignatureAction();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      fd.append("allowed_formats", sig.allowedFormats);
      const res = await fetch(sig.uploadUrl, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { secure_url: string };
      setUrl(json.secure_url);
      toast.success("Receipt attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name="receiptUrl" value={url} />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? "Uploading…" : url ? "Replace receipt" : "Attach receipt"}
      </Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">
          View
        </a>
      )}
    </div>
  );
}
