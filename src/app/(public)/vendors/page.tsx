import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";
import { listApprovedVendors } from "@/server/vendors/service";
import { primaryLogo } from "@/lib/vendor-assets";
import { Container } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Brands",
  description: "80+ handpicked indie brands — fusion wear, jewellery, decor, and more.",
};
export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await listApprovedVendors();

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">Meet the brands</h1>
      <p className="mt-2 text-muted-foreground">A handpicked lineup of independent makers you&apos;ll meet at the market.</p>

      {vendors.length === 0 ? (
        <EmptyState
          icon={Store}
          className="mt-10"
          title="The lineup drops soon"
          description="We're finalising this season's makers. Check back shortly to see who's joining."
        />
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {vendors.map((v) => {
            const logo = primaryLogo(v.assets);
            return (
              <Link
                key={v.id}
                href={`/vendors/${v.id}`}
                className="card-hover group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="relative aspect-[4/5] bg-muted">
                  {logo ? (
                    <Image src={logo} alt={v.brandName} fill className="object-cover" sizes="(max-width:768px) 50vw, 25vw" />
                  ) : (
                    <div className="grid size-full place-items-center font-display text-2xl text-muted-foreground">
                      {v.brandName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-medium group-hover:text-primary">{v.brandName}</p>
                  {v.category && <p className="text-xs text-muted-foreground">{v.category}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
