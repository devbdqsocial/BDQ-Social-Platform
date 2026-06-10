"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/motion";

type Props = {
  as?: "h1" | "h2" | "h3" | "p";
  /** "lines" (default) for body/intros; "chars" for hero headlines. */
  mode?: "lines" | "chars";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

// RPA masked text reveal: lines (or chars) rise from behind a clip. SplitText is imported lazily
// INSIDE the effect so it only ever loads on the client (it touches `document` at module-load,
// which crashes SSR). SSR renders the text fully visible; reduced-motion skips the animation.
export function SplitReveal({ as: Tag = "h2", mode = "lines", className, style, children }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let killed = false;
    let split: { lines: Element[]; chars: Element[]; revert: () => void } | null = null;
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
        type: mode === "chars" ? "chars,lines" : "lines",
        mask: "lines",
        linesClass: "split-line",
      }) as unknown as { lines: Element[]; chars: Element[]; revert: () => void };

      const targets = mode === "chars" ? split.chars : split.lines;
      gsap.set(targets, { yPercent: 110 });
      st = ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.to(targets, {
            yPercent: 0,
            duration: mode === "chars" ? DUR.micro : 0.7,
            ease: EASE.strong,
            stagger: mode === "chars" ? STAGGER.chars : STAGGER.lines,
          });
        },
      });
    })();

    return () => {
      killed = true;
      st?.kill();
      split?.revert();
    };
  }, [mode]);

  return (
    <Tag ref={ref as React.Ref<HTMLHeadingElement>} className={className} style={style}>
      {children}
    </Tag>
  );
}
