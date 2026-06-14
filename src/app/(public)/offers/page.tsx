import type { Metadata } from "next";
import { listVisibleOffers } from "@/server/content/offers";
import { OffersClient } from "@/components/events/OffersClient";

export const metadata: Metadata = { title: "Offers" };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const offers = await listVisibleOffers();

  return (
    <section className="paint py-[var(--space-4xl)]">
      <div className="wrapper max-w-[56rem]">
        <span className="kicker opacity-70">Just for tonight</span>
        <h1 className="f-exat mt-[var(--space-sm)] f-h76">Offers &amp; deals</h1>
        <p className="f-paragraph mt-[var(--space-md)] max-w-[46ch] opacity-80">
          Exclusive perks from the brands at the market — show the screen at the stall to claim.
        </p>

        <div className="mt-[var(--space-2xl)]">
          {offers.length === 0 ? (
            <div className="p-[var(--space-3xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
              <p className="f-exat f-h42">No offers live yet</p>
              <p className="f-paragraph-small mt-[var(--space-sm)] opacity-70">Brand deals appear here once the event is on. Keep an eye out.</p>
            </div>
          ) : (
            <OffersClient offers={offers} />
          )}
        </div>
      </div>
    </section>
  );
}
