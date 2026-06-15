"use client";

import { useState } from "react";
import { Download, Link as LinkIcon, X, Check } from "lucide-react";
import { track } from "@/lib/track";

type Fmt = "story" | "post";

/**
 * Ticket share art (R6.1) — preview, regenerate (format), native share, download, copy-link fallback.
 * Sharing never blocks: if the image/Web-Share fails, text + URL still work. Analytics is fire-and-forget.
 */
export function TicketShare({
  ticketId,
  eventName,
  shareUrl,
  variant = "button",
}: {
  ticketId: string;
  eventName: string;
  shareUrl?: string;
  variant?: "button" | "link";
}) {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState<Fmt>("story");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const imgUrl = `/api/share/ticket/${ticketId}?format=${fmt}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bdqsocial.com";
  const url = shareUrl ? new URL(shareUrl, origin).href : origin; // resolve relative event paths
  const text = `I'm going to ${eventName}! 🎉`;

  const openSheet = () => {
    setOpen(true);
    track("share_view", { ticketId });
  };

  const fetchFile = async (): Promise<File | null> => {
    try {
      const res = await fetch(imgUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], `bdq-${eventName.replace(/\W+/g, "-").toLowerCase()}.png`, { type: "image/png" });
    } catch {
      return null;
    }
  };

  const share = async () => {
    setBusy(true);
    track("share_attempted", { ticketId, fmt });
    try {
      const file = await fetchFile();
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (file && nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], text, url });
        track("share_completed", { ticketId, fmt, mode: "image" });
      } else if (nav.share) {
        await nav.share({ text, url });
        track("share_completed", { ticketId, fmt, mode: "link" });
      } else {
        await copyLink(); // desktop fallback
      }
    } catch {
      // user cancelled or share failed — not an error; the sheet stays open with download/copy
      track("share_failed", { ticketId, fmt });
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const file = await fetchFile();
    if (!file) return;
    const href = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(href);
    track("share_downloaded", { ticketId, fmt });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <>
      {variant === "link" ? (
        <button type="button" onClick={openSheet} className="f-paragraph-small f-bold t-upper link-underline" style={{ letterSpacing: "0.06em" }}>
          Share my pass
        </button>
      ) : (
        <button type="button" onClick={openSheet} className="btn btn--accent" data-cursor>
          <span className="btn__text">Share my pass</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-lg)]" role="dialog" aria-modal="true" aria-label="Share your pass">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="bg-ink relative w-full max-w-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]" style={{ color: "var(--light-blue)" }}>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full">
              <X className="size-5" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Your share art"
              onLoad={() => track("share_generated", { ticketId, fmt })}
              className="mx-auto w-[60%] rounded-[var(--radius-md)]"
              style={{ aspectRatio: fmt === "story" ? "9 / 16" : "4 / 5", objectFit: "cover" }}
            />

            <div className="mt-[var(--space-lg)] flex justify-center gap-[var(--space-sm)]">
              {(["story", "post"] as Fmt[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFmt(f)}
                  className="f-paragraph-small rounded-full px-[var(--space-md)] py-[var(--space-xs)] font-bold"
                  style={fmt === f ? { background: "var(--light-blue)", color: "var(--dark-blue)" } : { border: "1px solid color-mix(in srgb, currentColor 35%, transparent)" }}
                >
                  {f === "story" ? "Story 9:16" : "Post 4:5"}
                </button>
              ))}
            </div>

            <div className="mt-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
              <button type="button" onClick={share} disabled={busy} className="btn btn--lg btn--accent self-center" data-cursor>
                <span className="btn__text">{busy ? "Opening…" : "Share"}</span>
              </button>
              <div className="flex justify-center gap-[var(--space-lg)] pt-[var(--space-xs)]">
                <button type="button" onClick={download} className="f-paragraph-small inline-flex items-center gap-[var(--space-xs)] font-bold">
                  <Download className="size-4" /> Download
                </button>
                <button type="button" onClick={copyLink} className="f-paragraph-small inline-flex items-center gap-[var(--space-xs)] font-bold">
                  {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />} {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
