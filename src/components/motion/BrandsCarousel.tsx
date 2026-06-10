"use client";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

type Brand = { id: string; brandName: string; logo: string | null };

// RPA mod-slider: draggable Swiper of masked brand cards (slidesPerView 1.35 → 3.5).
export function BrandsCarousel({ brands }: { brands: Brand[] }) {
  return (
    <Swiper
      slidesPerView={1.35}
      spaceBetween={20}
      loop={brands.length > 4}
      breakpoints={{
        640: { slidesPerView: 2.5, spaceBetween: 28 },
        1024: { slidesPerView: 3.5, spaceBetween: 32 },
      }}
    >
      {brands.map((v) => (
        <SwiperSlide key={v.id}>
          <Link href={`/vendors/${v.id}`} data-cursor="view" className="block select-none">
            <div className="svg svg--form2 media-zoom media-tint w-full">
              {v.logo ? (
                <Image src={v.logo} alt={v.brandName} fill className="svg__img" sizes="33vw" />
              ) : (
                <div className="svg__bg grid place-items-center">
                  <span className="f-exat" style={{ fontSize: "var(--h60)", color: "var(--bgcolor)" }}>
                    {v.brandName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <p className="f-paragraph-small f-bold mt-[var(--space-sm)] truncate">{v.brandName}</p>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
