import type { Metadata } from "next";
import { Store } from "lucide-react";
import { listApprovedVendors } from "@/server/vendors/service";
import { primaryLogo } from "@/lib/vendor-assets";
import { bucketOf } from "@/server/map/guide";
import { EmptyState } from "@/components/ui/empty-state";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { VendorDiscover } from "@/components/vendors/VendorDiscover";

export const metadata: Metadata = {
  title: "Brands & Vendors in Vadodara",
  description: "Handpicked indie brands at BDQ Social Vadodara — fusion wear, jewellery, decor, food, and experiences. Meet the curated vendors of the city's premium night market.",
  alternates: { canonical: "/vendors" },
};
export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await listApprovedVendors();
  const cards = vendors.map((v) => ({
    id: v.id,
    brandName: v.brandName,
    category: v.category,
    bucket: bucketOf(v.productCategory, v.category),
    logo: primaryLogo(v.assets),
  }));

  return (
    <>
      <section className="bdq-rose paint flex min-h-[60svh] items-end py-[var(--space-5xl)]">
        <div className="wrapper">
          <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>The lineup</span>
          <SplitReveal as="h1" className="f-exat mt-[var(--space-md)] f-h133">
            Meet the brands
          </SplitReveal>
          <p className="f-paragraph mt-[var(--space-lg)] max-w-[44ch] opacity-80">
            A handpicked lineup of independent makers you&apos;ll meet at the market.
          </p>
        </div>
      </section>

      <section className="paint py-[var(--space-5xl)]">
        <div className="wrapper">
          {cards.length === 0 ? (
            <EmptyState
              icon={Store}
              title="The lineup drops soon"
              description="We're finalising this season's makers. Check back shortly to see who's joining."
            />
          ) : (
            <VendorDiscover vendors={cards} />
          )}
        </div>
      </section>
    </>
  );
}
