import Link from "next/link";
import { getGalleryPhotos } from "@/server/content/service";
import { cld } from "@/lib/cloudinary-url";

/**
 * Post-Event Memories (R6.5). When an event has ended (home mode POST), the home shifts from
 * attendance to memories: relive via the gallery, meet the brands, and look to the next edition.
 * Server component — fetches its own published gallery preview. Completes the PRE→LIVE→POST arc.
 */
export async function PostEventMemories({ eventName, brandCount, sponsorCount }: { eventName: string; brandCount: number; sponsorCount: number }) {
  const photos = (await getGalleryPhotos()).slice(0, 6);
  const bits = [
    brandCount > 0 ? `${brandCount} curated ${brandCount === 1 ? "brand" : "brands"}` : null,
    sponsorCount > 0 ? `${sponsorCount} ${sponsorCount === 1 ? "partner" : "partners"}` : null,
    "one unforgettable night",
  ].filter(Boolean);

  return (
    <section className="bdq-rose paint py-[var(--space-4xl)]">
      <div className="wrapper max-w-[68rem]">
        <p className="kicker opacity-75">That&apos;s a wrap</p>
        <h2 className="f-exat f-h76 mt-[var(--space-sm)] max-w-[18ch]">The night that was</h2>
        <p className="f-paragraph mt-[var(--space-lg)] opacity-85">{bits.join(" · ")} — thank you for being there.</p>

        {photos.length >= 3 && (
          <Link href="/gallery" data-cursor className="mt-[var(--space-2xl)] flex gap-[var(--space-md)] overflow-x-auto no-scrollbar pb-[var(--space-sm)]" aria-label="Relive the night in the gallery">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={cld(p.url, 360)} alt={p.caption ?? "Event photo"} className="h-44 w-32 shrink-0 rounded-[var(--radius-md)] object-cover sm:h-56 sm:w-40" />
            ))}
          </Link>
        )}

        <div className="mt-[var(--space-2xl)] flex flex-wrap items-center gap-[var(--space-lg)]">
          <Link href="/gallery" className="btn btn--lg btn--accent" data-cursor><span className="btn__text">Relive the night</span></Link>
          <Link href="/vendors" className="link--split f-paragraph font-bold">Meet the brands <span className="arrow">→</span></Link>
          <Link href="/events" className="link--split f-paragraph font-bold">The next edition <span className="arrow">→</span></Link>
        </div>
        <p className="kicker mt-[var(--space-xl)] opacity-60">{eventName}</p>
      </div>
    </section>
  );
}
