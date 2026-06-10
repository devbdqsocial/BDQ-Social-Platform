"use client";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const SERVICES: { n: string; title: string; body: string; gama: string }[] = [
  { n: "01", title: "Shopping", body: "80+ handpicked indie brands — fusion wear, jewellery, home, and thoughtful Diwali gifting you won't find at the mall.", gama: "gama-1 bg-1" },
  { n: "02", title: "Food", body: "A proper food court: the city's best cafés, bakers, and inventive street food. Clean, fresh, genuinely good.", gama: "gama-3 bg-1" },
  { n: "03", title: "Music", body: "Easy acoustic sets at sundown that build into a warm, high-energy night.", gama: "gama-2 surface-2" },
  { n: "04", title: "Photos", body: "Lounges, neon, and little surprises — bring friends and stay a while.", gama: "gama-1 bg-2" },
];

// servicios--anima: pinned horizontal scroll on desktop; degrades to a stacked vertical
// stack of full-height colour slides on mobile / reduced-motion (native scroll).
export function PinnedServices() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const tr = track.current;
    if (!el || !tr) return;
    if (window.matchMedia("(max-width: 950px), (prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const total = SERVICES.length;
      gsap.to(tr, {
        xPercent: (-100 * (total - 1)) / total,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          pin: true,
          scrub: 1,
          snap: { snapTo: 1 / (total - 1), duration: 0.4, ease: "power1.inOut" },
          end: () => "+=" + window.innerWidth * (total - 1),
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="pinned-services relative overflow-hidden">
      <div ref={track} className="pinned-track">
        {SERVICES.map((s) => (
          <div key={s.title} className={`pinned-slide ${s.gama} paint`}>
            <div className="wrapper">
              <span className="f-exat" style={{ fontSize: "var(--h42)" }}>{s.n}</span>
              <h2 className="f-exat mt-[var(--space-sm)]" style={{ fontSize: "var(--h235)", lineHeight: 0.9 }}>
                {s.title}
              </h2>
              <p className="f-paragraph mt-[var(--space-lg)] max-w-[40ch] opacity-80">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
