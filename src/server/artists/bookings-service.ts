import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { dayForTime } from "@/server/events/event-days";
import { deriveSettlement } from "./settlement";

/**
 * Per-event artist engagements: negotiation, agreed fee, set time, and confirm/cancel. A CONFIRMED +
 * published booking with a set time auto-materializes a public ScheduleItem (so it shows on /schedule +
 * the live happening strip with zero customer-side code). Settlement lands in Phase 3.
 */

/** Materialize / refresh / remove the public ScheduleItem mirroring this booking's set. */
async function syncSchedule(bookingId: string): Promise<void> {
  const b = await db.artistBooking.findUnique({
    where: { id: bookingId },
    include: { artist: { select: { stageName: true } } },
  });
  if (!b) return;
  const shouldShow = b.status === "CONFIRMED" && b.published && b.setStartsAt != null;

  if (shouldShow) {
    const days = await db.eventDay.findMany({ where: { eventId: b.eventId }, select: { id: true, startsAt: true, endsAt: true } });
    const data = {
      eventId: b.eventId,
      eventDayId: dayForTime(days, b.setStartsAt!)?.id ?? null,
      startsAt: b.setStartsAt!,
      endsAt: b.setEndsAt,
      title: `${b.artist.stageName} — live`,
      performer: b.artist.stageName,
      stageOrZone: b.stageOrZone,
    };
    if (b.scheduleItemId) {
      await db.scheduleItem.update({ where: { id: b.scheduleItemId }, data });
    } else {
      const item = await db.scheduleItem.create({ data });
      await db.artistBooking.update({ where: { id: b.id }, data: { scheduleItemId: item.id } });
    }
  } else if (b.scheduleItemId) {
    const sid = b.scheduleItemId;
    await db.artistBooking.update({ where: { id: b.id }, data: { scheduleItemId: null } });
    await db.scheduleItem.delete({ where: { id: sid } }).catch(() => {});
  }
}

export function createBooking(session: Session, eventId: string, artistId: string) {
  return withAudit(session, { action: "CREATE", entity: "ArtistBooking", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const artist = await db.artistProfile.findUnique({ where: { id: artistId }, select: { askingFeePaise: true } });
      const booking = await db.artistBooking.create({
        data: { eventId, artistId, agreedFeePaise: artist?.askingFeePaise ?? 0 },
      });
      return { result: booking, after: booking };
    },
  }));
}

export interface BookingUpdate {
  agreedFeePaise?: number;
  setStartsAt?: Date | null;
  setEndsAt?: Date | null;
  stageOrZone?: string | null;
  published?: boolean;
}

export function updateBooking(session: Session, id: string, data: BookingUpdate) {
  return withAudit(session, { action: "UPDATE", entity: "ArtistBooking", entityId: id }, async () => {
    const before = await db.artistBooking.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        const booking = await db.artistBooking.update({ where: { id }, data });
        await syncSchedule(id);
        return { result: booking, after: booking };
      },
    };
  });
}

export function logNegotiation(session: Session, id: string, note: string, agreedFeePaise?: number) {
  return withAudit(session, { action: "UPDATE", entity: "ArtistBooking", entityId: id }, async () => {
    const before = await db.artistBooking.findUnique({ where: { id }, select: { status: true, negotiationNote: true, agreedFeePaise: true } });
    return {
      before,
      run: async () => {
        const booking = await db.artistBooking.update({
          where: { id },
          data: {
            negotiationNote: note,
            negotiationAt: new Date(),
            ...(agreedFeePaise != null ? { agreedFeePaise } : {}),
            ...(before?.status === "INQUIRY" ? { status: "NEGOTIATING" as const } : {}),
          },
        });
        return { result: booking, after: { negotiationNote: booking.negotiationNote, agreedFeePaise: booking.agreedFeePaise, status: booking.status } };
      },
    };
  });
}

export function setBookingStatus(session: Session, id: string, status: "CONFIRMED" | "CANCELLED") {
  return withAudit(session, { action: status === "CONFIRMED" ? "CONFIRM" : "CANCEL", entity: "ArtistBooking", entityId: id }, async () => {
    const before = await db.artistBooking.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const booking = await db.artistBooking.update({ where: { id }, data: { status } });
        await syncSchedule(id); // confirm → publish set; cancel → remove it
        return { result: booking, after: { status: booking.status } };
      },
    };
  });
}

/**
 * Record a payout against a booking → a TALENT Expense (flows into event P&L automatically), then
 * recompute the booking's settlement from the sum of APPROVED|PAID payouts vs the agreed fee.
 */
export interface PayoutInput {
  amountPaise: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  receiptUrl?: string;
  incurredAt?: Date;
  note?: string;
}

export function recordPayout(session: Session, bookingId: string, input: PayoutInput) {
  return withAudit(session, { action: "PAYOUT", entity: "ArtistBooking", entityId: bookingId }, async () => {
    const booking = await db.artistBooking.findUnique({
      where: { id: bookingId },
      include: { artist: { select: { stageName: true } } },
    });
    if (!booking) throw new Error("Booking not found.");
    return {
      before: { settlement: booking.settlement },
      run: async () => {
        const approved = input.status === "APPROVED" || input.status === "PAID";
        await db.expense.create({
          data: {
            eventId: booking.eventId,
            category: "TALENT",
            artistBookingId: bookingId,
            title: `Payout — ${booking.artist.stageName}`,
            amountPaise: input.amountPaise,
            incurredAt: input.incurredAt ?? new Date(),
            status: input.status,
            receiptUrl: input.receiptUrl,
            note: input.note,
            recordedById: session.userId,
            approvedById: approved ? session.userId : null,
          },
        });
        const agg = await db.expense.aggregate({
          where: { artistBookingId: bookingId, status: { in: ["APPROVED", "PAID"] } },
          _sum: { amountPaise: true },
        });
        const paid = agg._sum.amountPaise ?? 0;
        const settlement = deriveSettlement(booking.agreedFeePaise, paid);
        const updated = await db.artistBooking.update({ where: { id: bookingId }, data: { settlement } });
        return { result: { settlement: updated.settlement, paid }, after: { settlement: updated.settlement } };
      },
    };
  });
}

/** This event's lineup (admin view): bookings with artist + set time + settlement + payouts. */
export function listEventLineup(eventId: string) {
  return db.artistBooking.findMany({
    where: { eventId },
    orderBy: [{ setStartsAt: "asc" }, { createdAt: "asc" }],
    include: {
      artist: { select: { id: true, stageName: true, type: true } },
      payouts: { select: { amountPaise: true, status: true, incurredAt: true }, orderBy: { incurredAt: "desc" } },
    },
  });
}
