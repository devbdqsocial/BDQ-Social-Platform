"use client";

import { useEffect, useRef, useState } from "react";
import { offerPhase, validityLabel, type OfferPhase } from "@/lib/offer";
import { markOfferUsedAction, type OfferDto } from "@/server/content/offers";

const KIND_LABEL: Record<string, string> = { DISCOUNT: "Discount", FREEBIE: "Freebie", BUNDLE: "Bundle" };

function timesOf(o: OfferDto) {
  return { startsAt: new Date(o.startsAtIso), endsAt: new Date(o.endsAtIso), status: o.status };
}

/** Offers list + the "Show at stall" redemption takeover (customer-portal §3.6). */
export function OffersClient({ offers }: { offers: OfferDto[] }) {
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState<OfferDto | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const visible = offers.filter((o) => offerPhase(timesOf(o), now) !== "upcoming"); // live + ended

  if (visible.length === 0) {
    return <p className="f-paragraph p-[var(--space-2xl)] text-center opacity-70" style={{ border: "1px dashed var(--color)" }}>No live offers right now — check back during the event.</p>;
  }

  return (
    <>
      <ul className="grid gap-[var(--space-lg)] sm:grid-cols-2">
        {visible.map((o) => {
          const phase: OfferPhase = offerPhase(timesOf(o), now);
          const ended = phase === "ended";
          return (
            <li key={o.id} className="bdq-surface p-[var(--space-xl)]" style={{ border: "1px solid color-mix(in srgb, currentColor 22%, transparent)", opacity: ended ? 0.5 : 1 }}>
              <div className="flex items-center justify-between gap-[var(--space-md)]">
                <p className="kicker opacity-70">{o.brandName ?? "BDQ"} · {KIND_LABEL[o.kind] ?? o.kind}</p>
                <span className={ended ? "badge-bdq badge-bdq--muted" : "badge-bdq"}>{ended ? "Ended" : validityLabel(new Date(o.endsAtIso), now)}</span>
              </div>
              <p className="f-exat mt-[var(--space-sm)] f-h42">{o.title}</p>
              <p className="f-paragraph-small mt-[var(--space-xs)] opacity-75">{o.terms}</p>
              {!ended && (
                <button type="button" onClick={() => setActive(o)} data-cursor className="btn mt-[var(--space-lg)]"><span className="btn__text">Show at stall</span></button>
              )}
            </li>
          );
        })}
      </ul>

      {active && <OfferRedeem offer={active} onClose={() => setActive(null)} />}
    </>
  );
}

function OfferRedeem({ offer, onClose }: { offer: OfferDto; onClose: () => void }) {
  const [clock, setClock] = useState(() => new Date());
  const [used, setUsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000); // live clock = anti-screenshot cue
    return () => clearInterval(id);
  }, []);

  const press = () => {
    if (used || busy) return;
    timer.current = setTimeout(async () => {
      setBusy(true);
      const res = await markOfferUsedAction(offer.id);
      setBusy(false);
      if (res.ok) setUsed(true);
    }, 800); // long-press
  };
  const release = () => { if (timer.current) clearTimeout(timer.current); };

  return (
    <div role="dialog" aria-label={offer.title} aria-modal className="bdq-night paint fixed inset-0 z-[60] flex flex-col items-center justify-center px-[var(--space-2xl)] text-center">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-[var(--space-xl)] top-[var(--space-xl)] f-h42">×</button>
      <p className="kicker opacity-80">{offer.brandName ?? "BDQ Social"}</p>
      <h2 className="f-exat mt-[var(--space-sm)] max-w-[16ch] f-h60">{offer.title}</h2>
      <p className="f-paragraph mt-[var(--space-md)] max-w-[40ch] opacity-80">{offer.terms}</p>
      <p className="f-exat mt-[var(--space-2xl)] tabular-nums f-h42" aria-live="off">{clock.toLocaleTimeString("en-IN")}</p>
      {used ? (
        <p className="f-exat mt-[var(--space-xl)] f-h42" style={{ color: "var(--success)" }}>Marked used ✓</p>
      ) : (
        <button
          type="button"
          onPointerDown={press} onPointerUp={release} onPointerLeave={release}
          className="mt-[var(--space-xl)] rounded-full px-[var(--space-2xl)] py-[var(--space-lg)] f-paragraph-small f-bold t-upper"
          style={{ border: "1px solid var(--color)", letterSpacing: "0.08em" }}
        >
          {busy ? "Marking…" : "Staff: press & hold to mark used"}
        </button>
      )}
      <p className="kicker mt-[var(--space-2xl)] opacity-50">One per person · terms apply</p>
    </div>
  );
}
