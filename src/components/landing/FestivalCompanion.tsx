import Link from "next/link";
import { Map, CalendarClock, Gift, Store, BookOpen, type LucideIcon } from "lucide-react";

/**
 * Festival Companion (R6.4 Live Event Mode). When the event is LIVE the home shifts from promotion
 * to utility: quick, thumb-friendly access to the surfaces a guest needs ON the ground. "Now / Next"
 * is the Happening Strip above this; these are the destinations. Server component (static links).
 */
const TILES: { href: string; label: string; sub: string; icon: LucideIcon }[] = [
  { href: "/map", label: "Map", sub: "Find your way around", icon: Map },
  { href: "/schedule", label: "Schedule", sub: "What's on, stage by stage", icon: CalendarClock },
  { href: "/offers", label: "Offers", sub: "Deals live right now", icon: Gift },
  { href: "/vendors", label: "Brands & food", sub: "Who's here tonight", icon: Store },
  { href: "/guide", label: "Guide", sub: "Facilities & essentials", icon: BookOpen },
];

export function FestivalCompanion() {
  return (
    <section className="gama-1 bg-1 paint py-[var(--space-3xl)]">
      <div className="wrapper max-w-[68rem]">
        <p className="kicker opacity-75">Your festival companion · live now</p>
        <h2 className="f-exat f-h60 mt-[var(--space-sm)]">Everything you need, in your pocket</h2>
        <div className="mt-[var(--space-2xl)] grid gap-[var(--space-md)] sm:grid-cols-3 lg:grid-cols-5">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              data-cursor
              className="group flex flex-col gap-[var(--space-sm)] rounded-[var(--radius-lg)] p-[var(--space-lg)] transition-colors"
              style={{ border: "1px solid color-mix(in srgb, currentColor 22%, transparent)", background: "color-mix(in srgb, currentColor 6%, transparent)" }}
            >
              <t.icon className="size-7" style={{ color: "var(--light-blue)" }} />
              <span className="f-h32 f-exat">{t.label}</span>
              <span className="f-paragraph-small opacity-70">{t.sub}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
