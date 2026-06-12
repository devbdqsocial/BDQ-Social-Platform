import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { listPendingOrders, listUserTickets } from "@/server/tickets/service";
import { toQrDataUrl } from "@/lib/qr-token";
import { AutoRefresh } from "@/components/admin/auto-refresh";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function CustomerDashboardPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { paid } = await searchParams;
  const [tickets, pending] = await Promise.all([listUserTickets(session.userId), listPendingOrders(session.userId)]);
  const withQr = await Promise.all(tickets.map(async (t) => ({ t, qr: await toQrDataUrl(t.qrToken) })));
  // "Confirming payment" renders only for a client-confirmed payment (?paid=<orderId>) whose
  // webhook hasn't landed yet (customer-portal §3.2 / failure-analysis #8). 5s auto-refresh
  // resolves it the moment the webhook/reconcile fulfils.
  const confirming = paid ? pending.find((o) => o.id === paid) : undefined;

  return (
    <section className="paint py-[var(--space-5xl)]">
      <div className="wrapper max-w-[62rem]">
        {confirming && <AutoRefresh seconds={5} />}
        <span className="kicker opacity-70">Your wallet</span>
        <h1 className="f-exat mt-[var(--space-sm)]" style={{ fontSize: "var(--h76)", lineHeight: 1.0 }}>Tickets</h1>
        <p className="f-paragraph mt-[var(--space-sm)] opacity-70">Show the QR code at the gate — that&apos;s your way in.</p>

        {confirming && (
          <div className="gama-1 bg-1 paint mt-[var(--space-2xl)] flex items-center gap-[var(--space-xl)] overflow-hidden rounded-[var(--radius-lg)] p-[var(--space-xl)]">
            <div className="min-w-0 flex-1">
              <p className="f-exat" style={{ fontSize: "var(--h42)", lineHeight: 1.05 }}>{confirming.event.name}</p>
              <p className="f-paragraph-small mt-[var(--space-xs)] opacity-80" aria-live="polite">
                Confirming payment — this takes under a minute.
              </p>
            </div>
            <div className="size-24 shrink-0 animate-pulse rounded-lg" style={{ background: "color-mix(in srgb, currentColor 18%, transparent)" }} />
          </div>
        )}

        {withQr.length === 0 && !confirming ? (
          <div className="mt-[var(--space-3xl)] p-[var(--space-2xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
            <p className="f-exat" style={{ fontSize: "var(--h42)", lineHeight: 1.05 }}>No tickets yet</p>
            <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">
              Just paid? Your tickets land here the moment payment is confirmed.
            </p>
            <div className="mt-[var(--space-lg)] flex justify-center">
              <Link href="/events" className="btn" data-cursor>
                <span className="btn__text">Find an event</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-[var(--space-3xl)] grid gap-[var(--space-lg)]">
            {withQr.map(({ t, qr }) => {
              const used = t.status === "CHECKED_IN";
              return (
                <div
                  key={t.id}
                  className="gama-1 bg-1 paint flex items-center gap-[var(--space-xl)] overflow-hidden rounded-[var(--radius-lg)] p-[var(--space-xl)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="f-exat" style={{ fontSize: "var(--h42)", lineHeight: 1.05 }}>{t.order.event.name}</p>
                    <p className="f-paragraph-small mt-[var(--space-xs)] opacity-70">
                      {t.ticketType.name} · {fmt(t.order.event.startsAt)}
                    </p>
                    <div className="mt-[var(--space-md)] flex items-center gap-[var(--space-md)]">
                      <span className={used ? "badge-rpa badge-rpa--muted" : "badge-rpa"}>
                        {used ? "Checked in" : "Valid"}
                      </span>
                      <span className="f-paragraph-small opacity-70">#{t.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="Ticket QR" className="size-24 shrink-0 rounded-lg bg-white p-1.5" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
