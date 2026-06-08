import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { SponsorTier, SponsorshipStatus, Prisma } from "@prisma/client";

/** Event sponsors + placements. Tiers rank TITLE → ASSOCIATE for public ordering. */

export interface SponsorWithFinance {
  id: string;
  eventId: string;
  name: string;
  tier: SponsorTier;
  logoUrl: string | null;
  placements: Prisma.JsonValue;
  leadAccess: boolean;
  amountPaise: number;
  status: SponsorshipStatus;
  paidAt: Date | null;
  note: string | null;
  createdAt: Date;
}

const TIER_ORDER: SponsorTier[] = ["TITLE", "POWERED_BY", "ZONE", "STALL", "ASSOCIATE"];

export async function sponsorsForEvent(eventId: string): Promise<SponsorWithFinance[]> {
  const rows = await db.sponsor.findMany({ where: { eventId } });
  const sorted = rows.sort(
    (a, b) => TIER_ORDER.indexOf(a.tier as SponsorTier) - TIER_ORDER.indexOf(b.tier as SponsorTier) || a.name.localeCompare(b.name),
  );
  return sorted as unknown as SponsorWithFinance[];
}

export const listSponsors = sponsorsForEvent;

export function createSponsor(
  session: Session,
  input: {
    eventId: string;
    name: string;
    tier: SponsorTier;
    logoUrl?: string;
    amountPaise?: number;
    status?: SponsorshipStatus;
    note?: string;
  }
): Promise<SponsorWithFinance> {
  return withAudit(session, { action: "CREATE", entity: "Sponsor", entityId: input.eventId }, async () => ({
    before: null,
    run: async () => {
      const s = await db.sponsor.create({
        data: {
          eventId: input.eventId,
          name: input.name,
          tier: input.tier,
          logoUrl: input.logoUrl ?? null,
          amountPaise: input.amountPaise ?? 0,
          status: input.status ?? "PROPOSED",
          note: input.note ?? null,
          paidAt: input.status === "PAID" ? new Date() : null,
        } as unknown as Prisma.SponsorCreateInput,
      });
      return { result: s as unknown as SponsorWithFinance, after: s };
    },
  })) as unknown as Promise<SponsorWithFinance>;
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

export function updateSponsor(
  session: Session,
  id: string,
  input: {
    name?: string;
    tier?: SponsorTier;
    logoUrl?: string | null;
    amountPaise?: number;
    status?: SponsorshipStatus;
    note?: string | null;
  }
): Promise<SponsorWithFinance> {
  return withAudit(session, { action: "UPDATE", entity: "Sponsor", entityId: id }, async () => {
    const beforeRaw = await db.sponsor.findUnique({ where: { id } });
    const before = beforeRaw as unknown as SponsorWithFinance | null;
    return {
      before,
      run: async () => {
        const data: Record<string, unknown> = { ...input };
        if (input.status === "PAID" && before?.status !== "PAID") {
          data.paidAt = new Date();
        } else if (input.status && input.status !== "PAID") {
          data.paidAt = null;
        }
        const after = await db.sponsor.update({
          where: { id },
          data: data as unknown as Prisma.SponsorUpdateInput,
        });
        return { result: after as unknown as SponsorWithFinance, after };
      },
    };
  }) as unknown as Promise<SponsorWithFinance>;
}
