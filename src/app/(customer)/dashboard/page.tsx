import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { getSession } from "@/server/auth/guard";
import { listUserTickets } from "@/server/tickets/service";
import { toQrDataUrl } from "@/lib/qr-token";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function CustomerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tickets = await listUserTickets(session.userId);
  const withQr = await Promise.all(tickets.map(async (t) => ({ t, qr: await toQrDataUrl(t.qrToken) })));

  return (
    <section className="paint py-[var(--space-5xl)]">
      <div className="wrapper max-w-[62rem]">
        <span className="f-paragraph-small f-bold t-upper opacity-50" style={{ letterSpacing: "0.18em" }}>Your wallet</span>
        <h1 className="f-exat mt-[var(--space-sm)]" style={{ fontSize: "var(--h76)", lineHeight: 1.0 }}>Tickets</h1>
        <p className="f-paragraph mt-[var(--space-sm)] opacity-70">Show the QR code at the gate — that&apos;s your way in.</p>

        {withQr.length === 0 ? (
          <EmptyState
            icon={Ticket}
            className="mt-10"
            title="No tickets yet"
            description="Just paid? Your tickets land here the moment payment is confirmed."
            action={
              <Button asChild>
                <Link href="/events">Find an event</Link>
              </Button>
            }
          />
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
                      <span
                        className="f-paragraph-small f-bold inline-flex items-center rounded-full px-[var(--space-md)] py-[2px] t-upper"
                        style={
                          used
                            ? { background: "rgba(255,255,255,0.12)", opacity: 0.7, letterSpacing: "0.1em" }
                            : { background: "var(--color)", color: "var(--bgcolor)", letterSpacing: "0.1em" }
                        }
                      >
                        {used ? "Checked in" : "Valid"}
                      </span>
                      <span className="f-paragraph-small opacity-50">#{t.id.slice(0, 8)}</span>
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
