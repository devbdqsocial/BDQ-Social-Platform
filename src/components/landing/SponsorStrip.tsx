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
      <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Our partners</p>
      <div className="mt-6 space-y-6">
        {tiers.map((tier) => (
          <div key={tier}>
            <p className="text-center text-[11px] uppercase tracking-wide text-muted-foreground/70">{TIER_LABEL[tier] ?? "Partners"}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              {sponsors.filter((s) => s.tier === tier).map((s) =>
                s.logoUrl ? (
                  <Image key={s.id} src={s.logoUrl} alt={s.name} title={s.name} width={160} height={64} className={`${tier === "TITLE" ? "h-16" : "h-10"} w-auto rounded-lg object-contain`} />
                ) : (
                  <span key={s.id} className={`rounded-lg border border-border bg-card px-4 py-2 font-display font-semibold ${tier === "TITLE" ? "text-lg" : "text-sm"}`}>
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
