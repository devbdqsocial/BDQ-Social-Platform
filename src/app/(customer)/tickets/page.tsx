import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/guard";
import { listPendingOrders, listUserTickets } from "@/server/tickets/service";
import { toQrDataUrl } from "@/lib/qr-token";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { BdqPageHeader, BdqEmpty } from "@/components/landing/BdqPageHeader";
import { TicketCard } from "@/components/tickets/TicketCard";
import { TicketReveal } from "@/components/tickets/TicketReveal";
import { TicketShare } from "@/components/tickets/TicketShare";
import { ArrivalGuide } from "@/components/tickets/ArrivalGuide";

export const metadata: Metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ reveal?: string; paid?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/tickets");

  const { reveal, paid } = await searchParams;
  const revealId = reveal ?? paid ?? null;

  const [tickets, pending, user] = await Promise.all([
    listUserTickets(session.userId),
    listPendingOrders(session.userId),
    db.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
  ]);
  const withQr = await Promise.all(tickets.map(async (t) => ({ t, qr: await toQrDataUrl(t.qrToken) })));

  // Soonest not-yet-ended event among the wallet's tickets → arrival guide / anticipation (R6.2).
  const soonest = withQr
    .map((x) => x.t.order.event)
    .filter((e) => e.startsAt.getTime() + 12 * 60 * 60 * 1000 > Date.now())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  // Reveal plays only when the order's tickets are actually PAID (present below) — never faked.
  const revealOrder = revealId ? withQr.find((x) => x.t.order.id === revealId) : undefined;
  // Otherwise, a client-confirmed-but-webhook-pending order shows the confirming state (failure #8).
  const confirming = revealId && !revealOrder ? pending.find((o) => o.id === revealId) : undefined;

  return (
    <section className="paint py-[var(--space-5xl)]">
      <div className="wrapper max-w-[var(--w-content)]">
        {confirming && <AutoRefresh seconds={5} />}
        {revealOrder && (
          <TicketReveal orderId={revealOrder.t.order.id} eventName={revealOrder.t.order.event.name} admitCount={revealOrder.t.admitCount} startsAtIso={revealOrder.t.order.event.startsAt.toISOString()} />
        )}

        <BdqPageHeader kicker="Your wallet" title="Tickets" lede="Show the QR code at the gate — that's your way in." />

        {soonest && (
          <div className="mt-[var(--space-2xl)]">
            <ArrivalGuide eventName={soonest.name} startsAtIso={soonest.startsAt.toISOString()} location={soonest.location} />
          </div>
        )}

        {revealOrder && (
          <div className="bdq-rose paint mt-[var(--space-2xl)] flex flex-wrap items-center justify-between gap-[var(--space-lg)] rounded-[var(--radius-lg)] p-[var(--space-xl)]">
            <div className="min-w-0">
              <p className="kicker opacity-75">You&apos;re going</p>
              <p className="f-h32 f-exat mt-1">Make it official — share your pass</p>
            </div>
            <TicketShare ticketId={revealOrder.t.id} eventName={revealOrder.t.order.event.name} shareUrl={`/events/${revealOrder.t.order.event.slug}`} variant="button" />
          </div>
        )}

        {confirming && (
          <div className="bdq-night paint mt-[var(--space-2xl)] flex items-center gap-[var(--space-xl)] overflow-hidden rounded-[var(--radius-lg)] p-[var(--space-xl)]">
            <div className="min-w-0 flex-1">
              <p className="f-exat f-h42">{confirming.event.name}</p>
              <p className="f-paragraph-small mt-[var(--space-xs)] opacity-80" aria-live="polite">Confirming payment — this takes under a minute.</p>
            </div>
            <div className="size-24 shrink-0 animate-pulse rounded-lg" style={{ background: "color-mix(in srgb, currentColor 18%, transparent)" }} />
          </div>
        )}

        {withQr.length === 0 && !confirming ? (
          <div className="mt-[var(--space-3xl)]">
            <BdqEmpty
              title="No tickets yet"
              body="Just paid? Your tickets land here the moment payment is confirmed."
              action={<Link href="/events" className="btn" data-cursor><span className="btn__text">Find an event</span></Link>}
            />
          </div>
        ) : (
          <div className="mt-[var(--space-3xl)] grid gap-[var(--space-lg)]">
            {withQr.map(({ t, qr }) => (
              <TicketCard
                key={t.id}
                d={{
                  ticketId: t.id,
                  orderId: t.order.id,
                  eventName: t.order.event.name,
                  typeName: t.ticketType.name,
                  startsAtIso: t.order.event.startsAt.toISOString(),
                  location: t.order.event.location,
                  admitCount: t.admitCount,
                  status: t.status,
                  qr,
                  eventUrl: `/events/${t.order.event.slug}`,
                  holderPhone: user?.phone ?? undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
