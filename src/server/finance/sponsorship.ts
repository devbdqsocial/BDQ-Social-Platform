import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import type { SponsorshipInput } from "@/server/schemas";

/** Sponsorship income — a revenue stream alongside tickets and stalls. Money is integer paise. */

export function listSponsorships(eventId?: string) {
  return db.sponsorship.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sponsorName: true,
      tier: true,
      amountPaise: true,
      status: true,
      paidAt: true,
      event: { select: { name: true } },
    },
  });
}

export async function createSponsorship(session: Session, input: SponsorshipInput): Promise<string> {
  return withAudit(session, { action: "SPONSORSHIP_CREATE", entity: "Sponsorship" }, async () => ({
    before: null,
    run: async () => {
      const s = await db.sponsorship.create({
        data: {
          eventId: input.eventId,
          sponsorName: input.sponsorName,
          tier: input.tier,
          amountPaise: input.amountPaise,
          status: input.status,
          note: input.note,
          paidAt: input.status === "PAID" ? new Date() : null,
        },
      });
      return { result: s.id, after: s };
    },
  }));
}

export async function setSponsorshipStatus(
  session: Session,
  id: string,
  status: SponsorshipInput["status"],
): Promise<void> {
  return withAudit(session, { action: "SPONSORSHIP_STATUS", entity: "Sponsorship", entityId: id }, async () => {
    const before = await db.sponsorship.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const s = await db.sponsorship.update({
          where: { id },
          data: { status, paidAt: status === "PAID" ? new Date() : null },
          select: { status: true },
        });
        return { result: undefined, after: s };
      },
    };
  });
}
