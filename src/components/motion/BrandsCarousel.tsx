import Image from "next/image";
import Link from "next/link";

import { CARD_SHAPES } from "@/lib/shapes";

type Brand = { id: string; brandName: string; logo: string | null };

/**
 * BDQ mod-slider as pure CSS scroll-snap (build-plan R2.3 — replaces swiper, the dep's only
 * consumer). Peek widths mirror the old slidesPerView 1.35 / 2.5 / 3.5; native touch scrolling,
 * zero JS shipped (no longer a client component).
 */
export function BrandsCarousel({ brands }: { brands: Brand[] }) {
  return (
    <ul
      className="-mx-[var(--wrapper-padd)] flex snap-x snap-mandatory gap-5 overflow-x-auto px-[var(--wrapper-padd)] pb-[var(--space-md)] sm:gap-7 lg:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Featured brands"
    >
      {brands.map((v, i) => (
        <li key={v.id} className="w-[74%] flex-none snap-start sm:w-[40%] lg:w-[28.5%]">
          <Link href={`/vendors/${v.id}`} data-cursor="view" className="block select-none">
            <div className={`svg ${CARD_SHAPES[i % CARD_SHAPES.length]} media-zoom media-tint w-full`}>
              {v.logo ? (
                <Image src={v.logo} alt={v.brandName} fill className="svg__img" sizes="33vw" />
              ) : (
                <div className="svg__bg grid place-items-center">
                  <span className="f-exat f-h60" style={{ color: "var(--bgcolor)" }}>
                    {v.brandName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <p className="f-paragraph-small f-bold mt-[var(--space-sm)] truncate">{v.brandName}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
