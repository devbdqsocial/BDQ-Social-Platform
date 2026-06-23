import "server-only";
import { db } from "@/server/db";

const paidSum = (payouts: { amountPaise: number }[]) => payouts.reduce((a, p) => a + p.amountPaise, 0);

/** Active-event artist KPIs for the dashboard: confirmed acts, talent spend, outstanding balance. */
export async function getArtistFinanceStats(eventId: string) {
  const [confirmedActs, bookings, talentAgg] = await Promise.all([
    db.artistBooking.count({ where: { eventId, status: "CONFIRMED" } }),
    db.artistBooking.findMany({
      where: { eventId, status: { not: "CANCELLED" } },
      select: { agreedFeePaise: true, payouts: { where: { status: { in: ["APPROVED", "PAID"] } }, select: { amountPaise: true } } },
    }),
    db.expense.aggregate({ where: { eventId, category: "TALENT", status: { in: ["APPROVED", "PAID"] } }, _sum: { amountPaise: true } }),
  ]);
  const agreed = bookings.reduce((s, b) => s + b.agreedFeePaise, 0);
  const paid = bookings.reduce((s, b) => s + paidSum(b.payouts), 0);
  return { confirmedActs, talentSpendPaise: talentAgg._sum.amountPaise ?? 0, unpaidPaise: Math.max(0, agreed - paid) };
}

/** TALENT spend broken down by artist (P&L drill-down), highest agreed fee first. */
export async function getTalentByArtist(eventId: string) {
  const bookings = await db.artistBooking.findMany({
    where: { eventId, status: { not: "CANCELLED" } },
    select: {
      agreedFeePaise: true,
      artist: { select: { stageName: true } },
      payouts: { where: { status: { in: ["APPROVED", "PAID"] } }, select: { amountPaise: true } },
    },
  });
  return bookings
    .map((b) => ({ stageName: b.artist.stageName, agreedPaise: b.agreedFeePaise, paidPaise: paidSum(b.payouts) }))
    .sort((a, b) => b.agreedPaise - a.agreedPaise);
}
