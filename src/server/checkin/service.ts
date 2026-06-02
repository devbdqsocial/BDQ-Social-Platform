import "server-only";
import { db } from "@/server/db";
import { verifyTicketToken } from "@/lib/qr-token";
import { classifyScan, type ScanResult } from "@/lib/checkin";

export interface CheckInResponse {
  result: ScanResult;
  holder?: string | null;
  ticketType?: string;
  event?: string;
}

function ok(ticket: { holderName: string | null; holderPhone: string | null; ticketType: { name: string }; order: { event: { name: string } } }): CheckInResponse {
  return {
    result: "VALID",
    holder: ticket.holderName ?? ticket.holderPhone ?? null,
    ticketType: ticket.ticketType.name,
    event: ticket.order.event.name,
  };
}

/**
 * Validate a scanned QR and check the ticket in once. Re-scan → ALREADY_USED; bad/unknown → INVALID.
 * Offline-sync safe: a re-sent scan with the same `clientScanId` returns its original VALID result
 * (not ALREADY_USED), so draining a queue twice is harmless.
 */
export async function checkInByToken(
  staffUserId: string,
  qrToken: string,
  gate?: string,
  clientScanId?: string,
): Promise<CheckInResponse> {
  // idempotency: this exact scan already succeeded → return the original VALID
  if (clientScanId) {
    const prior = await db.checkIn.findUnique({
      where: { clientScanId },
      include: { ticket: { include: { ticketType: { select: { name: true } }, order: { include: { event: { select: { name: true } } } } } } },
    });
    if (prior) return ok(prior.ticket);
  }

  const v = verifyTicketToken(qrToken);
  if (!v.valid || !v.ticketId) return { result: "INVALID" };

  const ticket = await db.ticket.findUnique({
    where: { id: v.ticketId },
    include: {
      ticketType: { select: { name: true } },
      order: { include: { event: { select: { name: true } } } },
    },
  });

  const result = classifyScan(ticket?.status ?? null);
  if (!ticket || result !== "VALID") return { result };

  // conditional update guards against a concurrent double scan
  const upd = await db.ticket.updateMany({
    where: { id: ticket.id, status: "VALID" },
    data: { status: "CHECKED_IN" },
  });
  if (upd.count === 0) return { result: "ALREADY_USED" };

  await db.checkIn.create({ data: { ticketId: ticket.id, scannedById: staffUserId, gate, direction: "IN", clientScanId } });

  return ok(ticket);
}

export function liveCheckedIn(eventId?: string) {
  return db.ticket.count({
    where: { status: "CHECKED_IN", ...(eventId ? { order: { eventId } } : {}) },
  });
}

/** Live attendance snapshot for an event (powers the gate capacity board). */
export async function capacitySnapshot(eventId: string) {
  const [event, checkedIn, sold, types] = await Promise.all([
    db.event.findUnique({ where: { id: eventId }, select: { name: true, capacity: true } }),
    db.ticket.count({ where: { status: "CHECKED_IN", order: { eventId } } }),
    db.ticket.count({ where: { order: { eventId } } }),
    db.ticketType.findMany({ where: { eventId }, select: { id: true, name: true }, orderBy: { priceInPaise: "asc" } }),
  ]);

  const byType = await Promise.all(
    types.map(async (t) => ({
      name: t.name,
      checkedIn: await db.ticket.count({ where: { ticketTypeId: t.id, status: "CHECKED_IN" } }),
      sold: await db.ticket.count({ where: { ticketTypeId: t.id } }),
    })),
  );

  return { event: event?.name ?? null, capacity: event?.capacity ?? null, checkedIn, sold, byType };
}
