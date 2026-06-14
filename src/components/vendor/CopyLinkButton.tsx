"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copy the lead-capture link to the clipboard (leads §6). */
export function CopyLinkButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* clipboard blocked — link is still visible to copy manually */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="f-paragraph-small inline-flex items-center gap-[var(--space-sm)] rounded-full border px-[var(--space-md)] py-[var(--space-xs)] font-bold transition-colors"
      style={{ borderColor: "color-mix(in srgb, currentColor 35%, transparent)" }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : "Copy link"}
    </button>
  );
}
