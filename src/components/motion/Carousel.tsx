"use client";

import { Children, useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CarouselProps = {
  children: React.ReactNode;
  options?: Parameters<typeof useEmblaCarousel>[0];
  /** auto-advance every 4.5s (disabled under reduced-motion) */
  autoplay?: boolean;
  /** show prev/next arrow controls */
  controls?: boolean;
  className?: string;
  /** per-slide basis, e.g. "basis-full" (default) or "basis-[82%] sm:basis-1/3" */
  slideClassName?: string;
};

// Embla carousel. Each child becomes a slide. Defaults to full-width looping slides.
export function Carousel({
  children,
  options,
  autoplay = false,
  controls = false,
  className,
  slideClassName = "basis-full",
}: CarouselProps) {
  const [ref, embla] = useEmblaCarousel({ loop: true, align: "start", ...options });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect).on("reInit", onSelect);
  }, [embla, onSelect]);

  useEffect(() => {
    if (!embla || !autoplay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => embla.scrollNext(), 4500);
    return () => clearInterval(id);
  }, [embla, autoplay]);

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden" ref={ref}>
        <div className="flex">
          {Children.map(children, (child) => (
            <div className={cn("min-w-0 shrink-0 grow-0 pl-4 first:pl-0", slideClassName)}>{child}</div>
          ))}
        </div>
      </div>
      {controls && (
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => embla?.scrollPrev()}
            disabled={!canPrev}
            className="grid size-11 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => embla?.scrollNext()}
            disabled={!canNext}
            className="grid size-11 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
