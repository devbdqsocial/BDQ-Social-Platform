import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <section className="gama-1 bg-1 paint min-h-[100svh] py-[var(--space-5xl)]">
      <div className="wrapper">
        <Reveal>
          <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.18em" }}>Say hi</span>
          <h1 className="f-exat mt-[var(--space-sm)] f-h133">
            Let&apos;s talk
          </h1>
        </Reveal>

        <div className="mt-[var(--space-4xl)] flex flex-col gap-[var(--space-4xl)] lg:flex-row lg:justify-between">
          <aside className="flex flex-col gap-[var(--space-2xl)] lg:w-[34%]">
            <div>
              <p className="f-paragraph-small f-bold t-upper opacity-50" style={{ letterSpacing: "0.16em" }}>Reach us</p>
              <a href={`mailto:${LEGAL.email}`} className="f-paragraph mt-[var(--space-sm)] block">{LEGAL.email}</a>
              <p className="f-paragraph opacity-80">{LEGAL.phone}</p>
              <p className="f-paragraph-small mt-[var(--space-xs)] opacity-60">Mon–Sat · 10:00–18:00 IST</p>
            </div>
            <div>
              <p className="f-paragraph-small f-bold t-upper opacity-50" style={{ letterSpacing: "0.16em" }}>Find us</p>
              <p className="f-paragraph mt-[var(--space-sm)] max-w-[34ch] opacity-80">
                {LEGAL.entity}, {LEGAL.address}
              </p>
            </div>
          </aside>

          <div className="lg:w-[56%]">
            <ContactForm to={LEGAL.email} />
          </div>
        </div>
      </div>
    </section>
  );
}
