import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Music4, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { listPublished } from "@/server/events/service";
import { listApprovedVendors } from "@/server/vendors/service";
import { sponsorsForEvent } from "@/server/sponsors/service";
import { primaryLogo } from "@/lib/vendor-assets";
import { formatPaise } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Section, Container } from "@/components/ui/section";
import { Countdown } from "@/components/landing/Countdown";
import { SponsorStrip } from "@/components/landing/SponsorStrip";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(d);

const ATTRACTIONS = [
  { icon: ShoppingBag, title: "Shopping you won't find at the mall", body: "80+ handpicked indie brands — fusion wear, jewellery, home, and thoughtful Diwali gifting." },
  { icon: UtensilsCrossed, title: "A proper food court", body: "The city's best cafés, bakers, and inventive street food. Clean, fresh, and genuinely good." },
  { icon: Music4, title: "Live music all evening", body: "Easy acoustic sets at sundown that build into a warm, high-energy night." },
  { icon: Camera, title: "Corners made for photos", body: "Lounges, neon, and little surprises — bring friends and stay a while." },
];

export default async function LandingPage() {
  const [events, brands] = await Promise.all([listPublished(), listApprovedVendors()]);
  const event = events[0];
  const featured = brands.slice(0, 6);
  const minPrice = event?.ticketTypes.length ? Math.min(...event.ticketTypes.map((t) => t.priceInPaise)) : null;
  const sponsors = event ? await sponsorsForEvent(event.id) : [];
  // Note: sponsors depends on event.id, so it cannot be parallelized with the initial fetch.

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero text-[#EDE6DA]">
        <Container className="flex flex-col items-center gap-6 py-24 text-center sm:py-32">
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-gold-300">
            {event?.location ?? "Vadodara"} · Curated night market
          </span>
          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-balance sm:text-7xl">
            The city&apos;s most <span className="text-gold-300">curated</span> night market
          </h1>
          <p className="max-w-xl text-lg text-[#C9BDA8] text-pretty">
            An evening of handpicked brands, gourmet food, and live music — the warm, grown-up
            alternative to the usual mela. Come for the finds, stay for the night.
          </p>
          {event && (
            <p className="text-sm font-medium text-[#C9BDA8]">
              {fmtDate(event.startsAt)} · {event.location}
            </p>
          )}
          {event && <Countdown target={event.startsAt.toISOString()} />}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 px-7 text-base shadow-glow">
              <Link href="/events">
                Get your tickets <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild className="h-12 bg-white/10 px-7 text-base text-white hover:bg-white/20">
              <Link href="/vendors">Meet the brands</Link>
            </Button>
          </div>
          {minPrice != null && (
            <p className="text-xs text-[#9c907c]">Tickets from {formatPaise(minPrice)} · QR delivered to your phone</p>
          )}
        </Container>
      </section>

      {/* Attractions */}
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl text-balance">What&apos;s waiting inside</h2>
          <p className="mt-3 text-muted-foreground text-pretty">
            One evening, four reasons to clear your calendar.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ATTRACTIONS.map((a) => (
            <div key={a.title} className="card-hover rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <a.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{a.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{a.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Featured brands */}
      {featured.length > 0 && (
        <section className="border-y border-border bg-card/40">
          <Container className="py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold sm:text-4xl">The brands</h2>
                <p className="mt-2 text-muted-foreground">A handpicked lineup of independent makers.</p>
              </div>
              <Link href="/vendors" className="shrink-0 text-sm font-medium text-primary hover:underline">
                See all →
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-6">
              {featured.map((v) => {
                const logo = primaryLogo(v.assets);
                return (
                  <Link key={v.id} href={`/vendors/${v.id}`} className="group">
                    <div className="card-hover relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
                      {logo ? (
                        <Image src={logo} alt={v.brandName} fill className="object-cover" sizes="(max-width:640px) 33vw, 17vw" />
                      ) : (
                        <div className="grid size-full place-items-center font-display text-2xl text-muted-foreground">
                          {v.brandName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 truncate text-center text-xs text-muted-foreground group-hover:text-primary">
                      {v.brandName}
                    </p>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <Section>
          <SponsorStrip sponsors={sponsors} />
        </Section>
      )}

      {/* Upcoming event CTA */}
      {event && (
        <Section>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-hero px-6 py-14 text-center text-[#EDE6DA] shadow-lg">
            <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold-300">Up next</span>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl text-balance">{event.name}</h2>
              <p className="text-[#C9BDA8]">{fmtDate(event.startsAt)} · {event.location}</p>
              {minPrice != null && <p className="text-lg font-medium">Tickets from {formatPaise(minPrice)}</p>}
              <Button asChild className="mt-2 h-12 px-7 text-base shadow-glow">
                <Link href={`/events/${event.slug}`}>
                  Get tickets <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Section>
      )}

      {/* FAQ */}
      <Container className="max-w-3xl pb-24">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Good to know</h2>
        <div className="mt-6 space-y-3">
          {[
            ["When is it?", "An evening event — gates open in the late afternoon and we go into the night, the weekend before Diwali."],
            ["How do I get in?", "Book a ticket online and we'll send a QR code to your phone. Show it at the gate — that's all there is to it."],
            ["Can I get a refund?", "All sales are final, so pick your date with confidence. No refunds."],
            ["Is there food?", "Plenty. A full food court with the city's best cafés, bakers, and street food."],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <summary className="cursor-pointer list-none font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted-foreground text-pretty">{a}</p>
            </details>
          ))}
        </div>
      </Container>
    </div>
  );
}
