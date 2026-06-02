import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Event sponsors + placements. Tiers rank TITLE → ASSOCIATE for public ordering. */

export type SponsorTier = "TITLE" | "POWERED_BY" | "ZONE" | "STALL" | "ASSOCIATE";
const TIER_ORDER: SponsorTier[] = ["TITLE", "POWERED_BY", "ZONE", "STALL", "ASSOCIATE"];

export async function sponsorsForEvent(eventId: string) {
  const rows = await db.sponsor.findMany({ where: { eventId } });
  return rows.sort(
    (a, b) => TIER_ORDER.indexOf(a.tier as SponsorTier) - TIER_ORDER.indexOf(b.tier as SponsorTier) || a.name.localeCompare(b.name),
  );
}

export const listSponsors = sponsorsForEvent;

export function createSponsor(session: Session, input: { eventId: string; name: string; tier: SponsorTier; logoUrl?: string }) {
  return withAudit(session, { action: "CREATE", entity: "Sponsor", entityId: input.eventId }, async () => ({
    before: null,
    run: async () => {
      const s = await db.sponsor.create({
        data: { eventId: input.eventId, name: input.name, tier: input.tier, logoUrl: input.logoUrl ?? null },
      });
      return { result: s, after: s };
    },
  }));
}

export function deleteSponsor(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "Sponsor", entityId: id }, async () => {
    const before = await db.sponsor.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.sponsor.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}
