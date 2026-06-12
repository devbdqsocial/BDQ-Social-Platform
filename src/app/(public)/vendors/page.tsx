import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";
import { listApprovedVendors } from "@/server/vendors/service";
import { primaryLogo } from "@/lib/vendor-assets";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";

export const metadata: Metadata = {
  title: "Brands",
  description: "80+ handpicked indie brands — fusion wear, jewellery, decor, and more.",
};
export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await listApprovedVendors();

  return (
    <>
      <section className="gama-2 surface-2 paint flex min-h-[60svh] items-end py-[var(--space-5xl)]">
        <div className="wrapper">
          <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>The lineup</span>
          <SplitReveal as="h1" className="f-exat mt-[var(--space-md)]" style={{ fontSize: "var(--h133)", lineHeight: 1.0 }}>
            Meet the brands
          </SplitReveal>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[44ch] opacity-80">
            A handpicked lineup of independent makers you&apos;ll meet at the market.
          </p>
        </div>
      </section>

      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper">
          {vendors.length === 0 ? (
            <EmptyState
              icon={Store}
              title="The lineup drops soon"
              description="We're finalising this season's makers. Check back shortly to see who's joining."
            />
          ) : (
            <Reveal stagger className="grid grid-cols-2 gap-[var(--grid-gap)] sm:grid-cols-3 lg:grid-cols-4">
              {vendors.map((v) => {
                const logo = primaryLogo(v.assets);
                return (
                  <Link key={v.id} href={`/vendors/${v.id}`} data-cursor className="block">
                    <div className="svg svg--form2 w-full">
                      {logo ? (
                        <Image src={logo} alt={v.brandName} fill className="svg__img" sizes="(max-width:768px) 50vw, 25vw" />
                      ) : (
                        <div className="svg__bg grid place-items-center">
                          <span className="f-exat" style={{ fontSize: "var(--h60)", color: "var(--bgcolor)" }}>
                            {v.brandName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="f-paragraph-small f-bold mt-[var(--space-sm)] truncate">{v.brandName}</p>
                    {v.category && <p className="f-paragraph-small truncate">{v.category}</p>}
                  </Link>
                );
              })}
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
