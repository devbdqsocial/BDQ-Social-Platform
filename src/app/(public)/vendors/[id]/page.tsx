import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovedVendor } from "@/server/vendors/service";
import { primaryLogo, productImages } from "@/lib/vendor-assets";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = await getApprovedVendor(id);
  return { title: v?.brandName ?? "Brand", description: v?.description ?? undefined };
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getApprovedVendor(id);
  if (!v) notFound();

  const logo = primaryLogo(v.assets);
  const products = productImages(v.assets);
  const socials = (v.socials as { instagram?: string } | null) ?? null;

  return (
    <>
      <section className="gama-1 bg-1 paint flex min-h-[85svh] items-end py-[var(--space-5xl)]">
        <div className="wrapper w-full">
          <Link href="/vendors" data-cursor className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.14em" }}>
            ← All brands
          </Link>
          <div className="mt-[var(--space-2xl)] grid items-end gap-[var(--space-3xl)] lg:grid-cols-2">
            <div>
              {v.category && (
                <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>{v.category}</span>
              )}
              <h1 className="f-exat mt-[var(--space-sm)]" style={{ fontSize: "var(--h133)", lineHeight: 0.95 }}>
                {v.brandName}
              </h1>
              {v.description && (
                <p className="f-paragraph mt-[var(--space-lg)] max-w-[48ch] opacity-80">{v.description}</p>
              )}
              <div className="f-paragraph-small f-bold mt-[var(--space-lg)] flex gap-[var(--space-lg)]">
                {v.website && (
                  <a href={v.website} target="_blank" rel="noreferrer" data-cursor className="underline">Website</a>
                )}
                {socials?.instagram && (
                  <a
                    href={`https://instagram.com/${socials.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor
                    className="underline"
                  >
                    {socials.instagram}
                  </a>
                )}
              </div>
            </div>
            {logo && (
              <div className="svg svg--form11 mx-auto w-[80%] lg:ml-auto lg:mr-0">
                <Image src={logo} alt={v.brandName} fill className="svg__img" sizes="40vw" priority />
              </div>
            )}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="paint py-[var(--space-5xl)]">
          <div className="wrapper">
            <h2 className="f-exat" style={{ fontSize: "var(--h60)", lineHeight: 1.05 }}>The goods</h2>
            <Reveal stagger className="mt-[var(--space-3xl)] grid grid-cols-2 gap-[var(--grid-gap)] sm:grid-cols-3">
              {products.map((src, i) => (
                <div key={i} className="svg svg--form2 w-full">
                  <Image src={src} alt="" fill className="svg__img" sizes="33vw" />
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      <section className="gama-3 bg-3 paint flex min-h-[60svh] items-center py-[var(--space-5xl)]">
        <div className="wrapper text-center">
          <h2 className="f-exat mx-auto max-w-[18ch]" style={{ fontSize: "var(--h100)", lineHeight: 1.0 }}>
            Find {v.brandName} at the market.
          </h2>
          <div className="mt-[var(--space-2xl)] flex justify-center">
            <Link href="/events" className="btn" data-cursor style={{ width: "8.5rem" }}>
              <span className="btn__text">Get tickets</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
