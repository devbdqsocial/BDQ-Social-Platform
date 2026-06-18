import type { Metadata } from "next";
import { getGalleryPhotos } from "@/server/content/service";
import { galleryReady } from "@/lib/content-gate";
import { GalleryGrid } from "@/components/events/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Moments from BDQ Social — photos from Vadodara's curated lifestyle festival and night market.",
  alternates: { canonical: "/gallery" },
};
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const photos = await getGalleryPhotos();
  const ready = galleryReady(photos.length);

  return (
    <section className="paint py-[var(--space-4xl)]">
      <div className="wrapper">
        <span className="kicker opacity-70">Moments</span>
        <h1 className="f-exat mt-[var(--space-sm)] f-h76">Gallery</h1>

        {!ready ? (
          <div className="mt-[var(--space-2xl)] p-[var(--space-3xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
            <p className="f-exat f-h42">The gallery lights up after the night</p>
            <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">We&apos;ll post the best moments here once the event wraps.</p>
          </div>
        ) : (
          <div className="mt-[var(--space-2xl)]">
            <GalleryGrid photos={photos} />
          </div>
        )}
      </div>
    </section>
  );
}
