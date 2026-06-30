import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovedVendor, getVendorStallLabel } from "@/server/vendors/service";
import { listVendorOffers } from "@/server/content/offers";
import { offerPhase, validityLabel } from "@/lib/offer";
import { primaryLogo, productImages } from "@/lib/vendor-assets";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = await getApprovedVendor(id);
  if (!v) return { title: "Brand" };
  const logo = primaryLogo(v.assets);
  const description = v.description ?? `Meet ${v.brandName}${v.category ? `, ${v.category.toLowerCase()},` : ""} at BDQ Social — Vadodara's curated lifestyle night market.`;
  return {
    title: v.brandName,
    description,
    alternates: { canonical: `/vendors/${id}` },
    openGraph: { title: v.brandName, description, type: "profile", images: logo ? [logo] : undefined },
    twitter: { card: logo ? "summary_large_image" : "summary", title: v.brandName, description },
  };
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getApprovedVendor(id);
  if (!v) notFound();

  const stallLabel = await getVendorStallLabel(v.id);
  const liveOffers = (await listVendorOffers(v.id)).filter((o) => offerPhase({ startsAt: new Date(o.startsAtIso), endsAt: new Date(o.endsAtIso), status: o.status }) === "live");
  const logo = primaryLogo(v.assets);
  const products = productImages(v.assets);
  const socials = (v.socials as { instagram?: string } | null) ?? null;

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Brands", path: "/vendors" },
          { name: v.brandName, path: `/vendors/${v.id}` },
        ])}
      />
      <section data-header-mode="light" className="bdq-night paint flex min-h-[85svh] items-end py-[var(--space-5xl)]">
        <div className="wrapper w-full">
          <Link href="/vendors" data-cursor className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.14em" }}>
            ← All brands
          </Link>
          <div className="mt-[var(--space-2xl)] grid items-end gap-[var(--space-3xl)] lg:grid-cols-2">
            <div>
              {v.category && (
                <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>{v.category}</span>
              )}
              <SplitReveal as="h1" mode="chars" className="f-exat mt-[var(--space-sm)] f-h133">
                {v.brandName}
              </SplitReveal>
              {v.description && (
                <p className="f-paragraph mt-[var(--space-lg)] max-w-[48ch]">{v.description}</p>
              )}
              <div className="f-paragraph-small f-bold mt-[var(--space-lg)] flex gap-[var(--space-lg)]">
                {v.website && (
                  <a href={v.website} target="_blank" rel="noopener noreferrer" data-cursor className="underline">Website</a>
                )}
                {socials?.instagram && (
                  <a
                    href={`https://instagram.com/${socials.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor
                    className="underline"
                  >
                    {socials.instagram}
                  </a>
                )}
              </div>
              {stallLabel && (
                <Link href="/map" data-cursor className="mt-[var(--space-lg)] inline-flex items-center gap-[var(--space-sm)] rounded-full px-[var(--space-lg)] py-[var(--space-sm)] f-paragraph-small f-bold" style={{ border: "1px solid var(--color)" }}>
                  Stall {stallLabel} — see on map →
                </Link>
              )}
            </div>
            {logo && (
              <div className="svg svg--form11 mx-auto w-[80%] lg:ml-auto lg:mr-0">
                <Image src={logo} alt={v.brandName} fill className="svg__img" sizes="40vw" priority />
              </div>
            )}
          </div>
        </div>
      </section>

      {liveOffers.length > 0 && (
        <section className="bdq-rose paint py-[var(--space-4xl)]">
          <div className="wrapper">
            <h2 className="f-exat f-h42">Live offers</h2>
            <ul className="mt-[var(--space-lg)] grid gap-[var(--space-lg)] sm:grid-cols-2">
              {liveOffers.map((o) => (
                <li key={o.id} className="bdq-surface p-[var(--space-lg)]" style={{ border: "1px solid color-mix(in srgb, currentColor 22%, transparent)" }}>
                  <div className="flex items-center justify-between gap-[var(--space-md)]">
                    <p className="f-exat f-h32">{o.title}</p>
                    <span className="badge-bdq">{validityLabel(new Date(o.endsAtIso))}</span>
                  </div>
                  <p className="f-paragraph-small mt-[var(--space-xs)] opacity-75">{o.terms}</p>
                  <Link href="/offers" data-cursor className="f-paragraph-small f-bold t-upper link-underline mt-[var(--space-md)] inline-block" style={{ letterSpacing: "0.06em" }}>Show at stall →</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="paint py-[var(--space-5xl)]">
          <div className="wrapper">
            <h2 className="f-exat f-h60">The goods</h2>
            <Reveal stagger className="mt-[var(--space-3xl)] grid grid-cols-2 gap-[var(--grid-gap)] sm:grid-cols-3">
              {products.map((src, i) => (
                <div key={i} className="svg svg--form2 media-zoom w-full">
                  <Image src={src} alt={`${v.brandName}${v.category ? ` — ${v.category}` : ""} product ${i + 1}`} fill className="svg__img" sizes="33vw" />
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      <section className="bdq-spark paint flex min-h-[60svh] items-center py-[var(--space-5xl)]">
        <div className="wrapper text-center">
          <h2 className="f-exat mx-auto max-w-[18ch] f-h100">
            Find {v.brandName} at the market.
          </h2>
          <div className="mt-[var(--space-2xl)] flex justify-center">
            <Magnetic>
              <Link href="/events" className="btn btn--lg" data-cursor>
                <span className="btn__text">Get tickets</span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>
    </>
  );
}
