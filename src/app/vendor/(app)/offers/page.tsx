import type { Metadata } from "next";
import Link from "next/link";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { listVendorBookedEvents, listMyOffers, MAX_OFFERS_PER_EVENT } from "@/server/vendors/offers";
import { createVendorOfferAction, publishVendorOfferAction, endVendorOfferAction, deleteVendorOfferAction } from "./actions";

export const metadata: Metadata = { title: "Offers" };
export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
// datetime-local wants local "YYYY-MM-DDTHH:mm".
const dtLocal = (d: Date) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); };
const KIND_LABEL: Record<string, string> = { DISCOUNT: "Discount", FREEBIE: "Freebie", BUNDLE: "Bundle" };

export default async function VendorOffersPage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) return <p className="f-paragraph-small opacity-70">Set up your brand first to create offers.</p>;

  const [events, offers] = await Promise.all([listVendorBookedEvents(profile.id), listMyOffers(profile.id)]);

  const header = (
    <div>
      <p className="kicker opacity-60">Offers</p>
      <h1 className="f-exat f-h60 mt-1">Your offers</h1>
      <p className="f-paragraph-small mt-[var(--space-sm)] opacity-75 text-pretty">
        Promos shoppers see on the event&apos;s deals page. Up to {MAX_OFFERS_PER_EVENT} per event.
      </p>
    </div>
  );

  if (events.length === 0) {
    return (
      <div className="max-w-3xl space-y-[var(--space-lg)]">
        {header}
        <p className="f-paragraph-small opacity-75 text-pretty">
          Offers unlock once your stall is confirmed.{" "}
          <Link href="/vendor/home" className="font-bold underline underline-offset-2" style={{ color: "var(--light-blue)" }}>Go to your home -&gt;</Link>
        </p>
      </div>
    );
  }

  const firstEvent = events[0];
  const inputCls = "w-full rounded-[var(--radius-md)] px-3 py-2 f-paragraph-small";
  const inputStyle = { border: "1px solid color-mix(in srgb, currentColor 24%, transparent)", background: "transparent", color: "var(--color)" } as const;

  return (
    <div className="mx-auto max-w-[52rem] space-y-[var(--space-3xl)]">
      {header}

      {/* Existing offers */}
      <section className="space-y-[var(--space-md)]">
        <h2 className="kicker opacity-60">Live &amp; draft</h2>
        {offers.length === 0 ? (
          <p className="f-paragraph-small opacity-70">No offers yet — create your first one below.</p>
        ) : (
          <ul className="space-y-[var(--space-md)]">
            {offers.map((o) => (
              <li key={o.id} className="rounded-[var(--radius-lg)] p-[var(--space-lg)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
                <div className="flex flex-wrap items-start justify-between gap-[var(--space-md)]">
                  <div className="min-w-0">
                    <p className="f-paragraph f-bold">{o.title}</p>
                    <p className="f-paragraph-small mt-[var(--space-xs)] opacity-70">{o.terms}</p>
                    <p className="f-paragraph-small mt-[var(--space-xs)] opacity-55">
                      {KIND_LABEL[o.kind] ?? o.kind} · {o.event.name} · {fmt(o.startsAt)} – {fmt(o.endsAt)}
                      {" · "}{o.redeemedCount} redeemed{o.maxRedemptions != null ? ` / ${o.maxRedemptions}` : ""}
                    </p>
                  </div>
                  <span className={`badge-bdq shrink-0 ${o.status === "PUBLISHED" ? "" : "badge-bdq--muted"}`}>
                    {o.status === "PUBLISHED" ? "Live" : o.status === "ENDED" ? "Ended" : "Draft"}
                  </span>
                </div>
                <div className="mt-[var(--space-md)] flex flex-wrap gap-[var(--space-md)]">
                  {o.status !== "PUBLISHED" && (
                    <form action={publishVendorOfferAction}>
                      <input type="hidden" name="offerId" value={o.id} />
                      <button type="submit" className="f-paragraph-small f-bold underline underline-offset-2" style={{ color: "var(--light-blue)" }}>Publish</button>
                    </form>
                  )}
                  {o.status === "PUBLISHED" && (
                    <form action={endVendorOfferAction}>
                      <input type="hidden" name="offerId" value={o.id} />
                      <button type="submit" className="f-paragraph-small f-bold underline underline-offset-2 opacity-80">End now</button>
                    </form>
                  )}
                  {o.status !== "PUBLISHED" && (
                    <form action={deleteVendorOfferAction}>
                      <input type="hidden" name="offerId" value={o.id} />
                      <button type="submit" className="f-paragraph-small f-bold underline underline-offset-2 opacity-60">Delete</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Create */}
      <section className="rounded-[var(--radius-lg)] p-[var(--space-xl)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)", background: "color-mix(in srgb, currentColor 3%, transparent)" }}>
        <h2 className="f-exat f-h32">New offer</h2>
        <form action={createVendorOfferAction} className="mt-[var(--space-lg)] grid gap-[var(--space-md)] sm:grid-cols-2">
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="kicker opacity-60">Event</span>
            <select name="eventId" required defaultValue={firstEvent.id} className={inputCls} style={inputStyle}>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="kicker opacity-60">Type</span>
            <select name="kind" required defaultValue="DISCOUNT" className={inputCls} style={inputStyle}>
              <option value="DISCOUNT">Discount</option>
              <option value="FREEBIE">Freebie</option>
              <option value="BUNDLE">Bundle</option>
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="kicker opacity-60">Title</span>
            <input name="title" required maxLength={80} placeholder="10% off everything" className={inputCls} style={inputStyle} />
          </label>
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="kicker opacity-60">Terms</span>
            <input name="terms" required maxLength={300} placeholder="Show this at our stall. One per customer." className={inputCls} style={inputStyle} />
          </label>
          <label className="grid gap-1.5">
            <span className="kicker opacity-60">Starts</span>
            <input type="datetime-local" name="startsAt" required defaultValue={dtLocal(firstEvent.startsAt)} className={inputCls} style={inputStyle} />
          </label>
          <label className="grid gap-1.5">
            <span className="kicker opacity-60">Ends</span>
            <input type="datetime-local" name="endsAt" required defaultValue={dtLocal(firstEvent.endsAt)} className={inputCls} style={inputStyle} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn--accent" data-cursor><span className="btn__text">Create offer</span></button>
          </div>
        </form>
        <p className="f-paragraph-small mt-[var(--space-md)] opacity-55">New offers start as a draft. Publish when you&apos;re ready for shoppers to see it. The offer window must sit inside the event dates.</p>
      </section>
    </div>
  );
}
