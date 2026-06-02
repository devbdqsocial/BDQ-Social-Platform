import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { getSession } from "@/server/auth/guard";
import { listUserTickets } from "@/server/tickets/service";
import { toQrDataUrl } from "@/lib/qr-token";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "My tickets" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function MyTicketsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tickets = await listUserTickets(session.userId);
  const withQr = await Promise.all(tickets.map(async (t) => ({ t, qr: await toQrDataUrl(t.qrToken) })));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">My tickets</h1>
      <p className="mt-2 text-muted-foreground">Show the QR code at the gate — that&apos;s your way in.</p>

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
        <div className="mt-8 space-y-4">
          {withQr.map(({ t, qr }) => {
            const used = t.status === "CHECKED_IN";
            return (
              <div
                key={t.id}
                className="flex items-center gap-5 overflow-hidden rounded-2xl border border-white/10 bg-hero p-5 text-[#EDE6DA] shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold">{t.order.event.name}</p>
                  <p className="text-sm text-[#C9BDA8]">{t.ticketType.name} · {fmt(t.order.event.startsAt)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        used ? "bg-white/10 text-[#C9BDA8]" : "bg-gold-500/20 text-gold-300"
                      }`}
                    >
                      {used ? "Checked in" : "Valid"}
                    </span>
                    <span className="text-xs text-[#9c907c]">#{t.id.slice(0, 8)}</span>
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Ticket QR" className="size-24 shrink-0 rounded-lg bg-white p-1.5" />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
