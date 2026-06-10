"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type Props = {
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

// RPA masked line reveal: each line rises from behind a clip. SplitText is imported lazily INSIDE
// the effect so it only ever loads on the client (it touches `document` at module-load, which
// crashes SSR). SSR renders the text fully visible; reduced-motion skips the animation.
export function SplitReveal({ as: Tag = "h2", className, style, children }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let killed = false;
    let split: { lines: Element[]; revert: () => void } | null = null;
    let st: { kill: () => void } | null = null;

    (async () => {
      const mod = await import("gsap/SplitText");
      gsap.registerPlugin(mod.SplitText);
      try {
        await document.fonts?.ready;
      } catch {
        /* fonts API unavailable — proceed */
      }
      if (killed || !ref.current) return;

      split = new mod.SplitText(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
      }) as unknown as { lines: Element[]; revert: () => void };

      gsap.set(split.lines, { yPercent: 110 });
      st = ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          if (split) gsap.to(split.lines, { yPercent: 0, duration: 0.7, ease: "power3.out", stagger: 0.1 });
        },
      });
    })();

    return () => {
      killed = true;
      st?.kill();
      split?.revert();
    };
  }, []);

  return (
    <Tag ref={ref as React.Ref<HTMLHeadingElement>} className={className} style={style}>
      {children}
    </Tag>
  );
}
