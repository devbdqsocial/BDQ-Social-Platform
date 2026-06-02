import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovedVendor } from "@/server/vendors/service";
import { primaryLogo, productImages } from "@/lib/vendor-assets";

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
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <Link href="/vendors" className="text-sm text-muted-foreground hover:text-foreground">← All brands</Link>

      <header className="mt-4 flex items-center gap-5">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={v.brandName} className="size-24 rounded-xl border border-border object-cover" />
        )}
        <div>
          <h1 className="font-display text-3xl font-semibold">{v.brandName}</h1>
          {v.category && <p className="text-muted-foreground">{v.category}</p>}
        </div>
      </header>

      {v.description && <p className="mt-6 text-lg leading-relaxed">{v.description}</p>}

      <div className="mt-4 flex gap-4 text-sm">
        {v.website && (
          <a href={v.website} target="_blank" rel="noreferrer" className="text-primary underline">Website</a>
        )}
        {socials?.instagram && (
          <a
            href={`https://instagram.com/${socials.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            {socials.instagram}
          </a>
        )}
      </div>

      {products.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Products</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {products.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="aspect-square w-full rounded-lg border border-border object-cover" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
