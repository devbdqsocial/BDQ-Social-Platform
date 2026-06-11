import Image from "next/image";

type Sponsor = { id: string; name: string; tier: string; logoUrl: string | null };

const TIER_LABEL: Record<string, string> = {
  TITLE: "Title sponsor",
  POWERED_BY: "Powered by",
  ZONE: "Zone partners",
  STALL: "Partners",
  ASSOCIATE: "Associate partners",
};

/** Public sponsor placement — logos (or name chips), grouped by tier. */
export function SponsorStrip({ sponsors, className }: { sponsors: Sponsor[]; className?: string }) {
  if (sponsors.length === 0) return null;

  const tiers = [...new Set(sponsors.map((s) => s.tier))];

  return (
    <div className={className}>
      <p className="kicker text-center opacity-70">Our partners</p>
      <div className="mt-[var(--space-xl)] space-y-[var(--space-xl)]">
        {tiers.map((tier) => (
          <div key={tier}>
            <p className="kicker text-center opacity-70">{TIER_LABEL[tier] ?? "Partners"}</p>
            <div className="mt-[var(--space-md)] flex flex-wrap items-center justify-center gap-[var(--space-lg)]">
              {sponsors.filter((s) => s.tier === tier).map((s) =>
                s.logoUrl ? (
                  <Image key={s.id} src={s.logoUrl} alt={s.name} title={s.name} width={160} height={64} className={`${tier === "TITLE" ? "h-16" : "h-10"} w-auto object-contain`} />
                ) : (
                  <span
                    key={s.id}
                    className="f-exat px-[var(--space-lg)] py-[var(--space-sm)]"
                    style={{ border: "1px solid currentColor", fontSize: tier === "TITLE" ? "var(--h42)" : "var(--h32)", lineHeight: 1.1 }}
                  >
                    {s.name}
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
