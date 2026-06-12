import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { verifyTicketToken } from "@/lib/qr-token";
import { classifyScan, type ScanResult } from "@/lib/checkin";

export interface CheckInResponse {
  result: ScanResult;
  holder?: string | null;
  ticketType?: string;
  event?: string;
  /** Group-QR (R1.2): people admitted by THIS scan / still outstanding / ticket total. */
  admitted?: number;
  remaining?: number;
  admitCount?: number;
}

type TicketWithMeta = {
  id: string;
  status: string;
  admitCount: number;
  holderName: string | null;
  holderPhone: string | null;
  ticketType: { name: string };
  order: { event: { name: string } };
};

const TICKET_INCLUDE = {
  ticketType: { select: { name: true } },
  order: { include: { event: { select: { name: true } } } },
} as const;

function ok(ticket: TicketWithMeta, admitted: number, remaining: number): CheckInResponse {
  return {
    result: "VALID",
    holder: ticket.holderName ?? ticket.holderPhone ?? null,
    ticketType: ticket.ticketType.name,
    event: ticket.order.event.name,
    admitted,
    remaining,
    admitCount: ticket.admitCount,
  };
}

async function admittedSoFar(tx: Prisma.TransactionClient | typeof db, ticketId: string): Promise<number> {
  const agg = await tx.checkIn.aggregate({ _sum: { admitted: true }, where: { ticketId, direction: "IN" } });
  return agg._sum.admitted ?? 0;
}

/**
 * Validate a scanned QR and admit people against the ticket's `admitCount` (group-QR, R1.2).
 * Default admits everyone still outstanding; `admitRequested` allows partial admits
 * ("3 of us now, 2 later"). The ticket flips to CHECKED_IN only when fully admitted; until
 * then re-scans stay VALID for the remainder. Fully-admitted re-scan → ALREADY_USED.
 * Offline-sync safe: a re-sent scan with the same `clientScanId` returns its original VALID
 * result, so draining a queue twice is harmless.
 */
export async function checkInByToken(
  staffUserId: string,
  qrToken: string,
  gate?: string,
  clientScanId?: string,
  admitRequested?: number,
): Promise<CheckInResponse> {
  // idempotency: this exact scan already succeeded → return the original VALID
  if (clientScanId) {
    const prior = await db.checkIn.findUnique({
      where: { clientScanId },
      include: { ticket: { include: TICKET_INCLUDE } },
    });
    if (prior) {
      const done = await admittedSoFar(db, prior.ticketId);
      return ok(prior.ticket, prior.admitted, Math.max(0, prior.ticket.admitCount - done));
    }
  }

  const v = verifyTicketToken(qrToken);
  if (!v.valid || !v.ticketId) return { result: "INVALID" };

  try {
    return await db.$transaction(async (tx) => {
      // Serialize concurrent scans of the SAME ticket (two gates, one group QR).
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${v.ticketId} FOR UPDATE`;

      const ticket = await tx.ticket.findUnique({ where: { id: v.ticketId }, include: TICKET_INCLUDE });
      const classified = classifyScan(ticket?.status ?? null);
      if (!ticket || classified === "INVALID") return { result: "INVALID" as ScanResult };

      const done = await admittedSoFar(tx, ticket.id);
      const outstanding = ticket.admitCount - done;
      if (classified === "ALREADY_USED" || outstanding <= 0) return { result: "ALREADY_USED" as ScanResult };

      const admit = Math.max(1, Math.min(admitRequested ?? outstanding, outstanding));
      await tx.checkIn.create({
        data: { ticketId: ticket.id, scannedById: staffUserId, gate, direction: "IN", clientScanId, admitted: admit },
      });
      if (done + admit >= ticket.admitCount) {
        await tx.ticket.update({ where: { id: ticket.id }, data: { status: "CHECKED_IN" } });
      }
      return ok(ticket, admit, ticket.admitCount - done - admit);
    });
  } catch (e) {
    // Unique clientScanId race (same offline scan synced twice concurrently) → return the original.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && clientScanId) {
      const prior = await db.checkIn.findUnique({
        where: { clientScanId },
        include: { ticket: { include: TICKET_INCLUDE } },
      });
      if (prior) {
        const done = await admittedSoFar(db, prior.ticketId);
        return ok(prior.ticket, prior.admitted, Math.max(0, prior.ticket.admitCount - done));
      }
    }
    throw e;
  }
}

/** Live people-in count (group-QR aware: sums admitted heads, not ticket rows). */
export async function liveCheckedIn(eventId?: string): Promise<number> {
  const agg = await db.checkIn.aggregate({
    _sum: { admitted: true },
    where: { direction: "IN", ...(eventId ? { ticket: { order: { eventId } } } : {}) },
  });
  return agg._sum.admitted ?? 0;
}

/** Live attendance snapshot for an event (powers the gate capacity board). Heads, not rows. */
export async function capacitySnapshot(eventId: string) {
  const [event, checkedIn, soldAgg, types, grouped, admittedByType] = await Promise.all([
    db.event.findUnique({ where: { id: eventId }, select: { name: true, capacity: true } }),
    liveCheckedIn(eventId),
    db.ticket.aggregate({ _sum: { admitCount: true }, where: { order: { eventId } } }),
    db.ticketType.findMany({ where: { eventId }, select: { id: true, name: true }, orderBy: { priceInPaise: "asc" } }),
    db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: { order: { eventId } },
      _sum: { admitCount: true },
    }),
    db.$queryRaw<{ ticketTypeId: string; admitted: bigint }[]>`
      SELECT t."ticketTypeId", COALESCE(SUM(c."admitted"), 0) AS admitted
      FROM "CheckIn" c
      JOIN "Ticket" t ON t."id" = c."ticketId"
      JOIN "Order" o ON o."id" = t."orderId"
      WHERE o."eventId" = ${eventId} AND c."direction" = 'IN'
      GROUP BY t."ticketTypeId"`,
  ]);

  const soldMap = new Map(grouped.map((g) => [g.ticketTypeId, g._sum.admitCount ?? 0]));
  const inMap = new Map(admittedByType.map((r) => [r.ticketTypeId, Number(r.admitted)]));
  const byType = types.map((t) => ({
    name: t.name,
    sold: soldMap.get(t.id) ?? 0,
    checkedIn: inMap.get(t.id) ?? 0,
  }));

  return { event: event?.name ?? null, capacity: event?.capacity ?? null, checkedIn, sold: soldAgg._sum.admitCount ?? 0, byType };
}
