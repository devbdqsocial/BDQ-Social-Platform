"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const STEPS: { word: string; body: string; gama: string }[] = [
  { word: "Arrive", body: "Gates open in the late afternoon. Golden hour, easy energy, the night ahead of you.", gama: "gama-1 bg-1" },
  { word: "Wander", body: "80+ handpicked brands, a proper food court, and corners made for photos.", gama: "gama-3 bg-1" },
  { word: "Linger", body: "Acoustic sets at sundown build into a warm, high-energy night. Stay a while.", gama: "gama-1 bg-2" },
];

// conceptos: a pinned section that crossfades through steps (and recolours) as you scroll.
// Desktop only (ScrollTrigger pin); mobile/reduced-motion = stacked colour panels, native scroll.
export function PinnedConcepts() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    if (!el || !st) return;
    if (window.matchMedia("(max-width: 950px), (prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".concept-panel", st);
      gsap.set(panels.slice(1), { opacity: 0 });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => "+=" + window.innerHeight * panels.length,
          pin: st,
          scrub: 1,
          snap: 1 / (panels.length - 1),
        },
      });
      panels.forEach((p, i) => {
        if (i === 0) return;
        tl.to(panels[i - 1], { opacity: 0, duration: 0.5 }).to(p, { opacity: 1, duration: 0.5 }, "<");
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="concept-stage-root">
      <div ref={stage} className="concept-stage">
        {STEPS.map((s) => (
          <div key={s.word} className={`concept-panel ${s.gama} paint`}>
            <div className="wrapper">
              <h2 className="f-exat" style={{ fontSize: "var(--h235)", lineHeight: 0.9 }}>{s.word}</h2>
              <p className="f-paragraph mx-auto mt-[var(--space-lg)] max-w-[34ch] opacity-80">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
