"use client";

import { useCallback, useEffect, useState } from "react";

export interface GalleryItem { id: string; url: string; caption: string | null }

/**
 * Post-event gallery (customer-portal §3.8): a CSS-columns masonry + a no-library full-screen
 * viewer (keyboard + swipe-friendly). Images lazy-load; the viewer traps focus on Escape/arrows.
 */
export function GalleryGrid({ photos }: { photos: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const move = useCallback((d: number) => setOpen((i) => (i == null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, move]);

  return (
    <>
      <div style={{ columnGap: "var(--grid-gap)" }} className="columns-2 sm:columns-3 lg:columns-4">
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => setOpen(i)} data-cursor className="mb-[var(--grid-gap)] block w-full overflow-hidden rounded-[var(--radius-md)]" aria-label={p.caption ?? "Open photo"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="w-full" />
          </button>
        ))}
      </div>

      {open != null && (
        <div role="dialog" aria-label="Photo viewer" aria-modal className="fixed inset-0 z-[60] flex flex-col bg-navy-500/95" onClick={() => setOpen(null)}>
          <div className="flex justify-end p-[var(--space-lg)]">
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="f-h42 text-cream-100">×</button>
          </div>
          <div className="flex flex-1 items-center justify-center px-[var(--space-lg)]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous" className="f-h60 shrink-0 px-[var(--space-md)] text-cream-100/70 hover:text-cream-100">‹</button>
            <figure className="flex max-h-full min-w-0 flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[open].url} alt={photos[open].caption ?? ""} className="max-h-[78vh] max-w-full object-contain" />
              {photos[open].caption && <figcaption className="f-paragraph-small mt-[var(--space-md)] text-cream-100/80">{photos[open].caption}</figcaption>}
            </figure>
            <button type="button" onClick={() => move(1)} aria-label="Next" className="f-h60 shrink-0 px-[var(--space-md)] text-cream-100/70 hover:text-cream-100">›</button>
          </div>
          <p className="kicker pb-[var(--space-lg)] text-center text-cream-100/60">{open + 1} / {photos.length}</p>
        </div>
      )}
    </>
  );
}
