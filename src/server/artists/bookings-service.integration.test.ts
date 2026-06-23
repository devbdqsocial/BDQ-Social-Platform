import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createBooking, updateBooking, setBookingStatus, recordPayout } from "./bookings-service";
import type { Session } from "@/server/auth/guard";

// Exercises booking → public ScheduleItem sync against a real DB. Skipped unless RUN_DB_TESTS=1.
const db = new PrismaClient();
const S: Session = { userId: "admin_seed", role: "SUPER_ADMIN", permissions: [] };
const tag = `artisttest_${Date.now()}`;

describe.runIf(process.env.RUN_DB_TESTS === "1")("artist booking → schedule sync", () => {
  afterAll(async () => {
    await db.event.deleteMany({ where: { slug: { startsWith: tag } } }); // cascades bookings + schedule
    await db.artistProfile.deleteMany({ where: { stageName: { startsWith: tag } } });
    await db.$disconnect();
  });

  it("confirmed + published + set time materializes a linked ScheduleItem; cancel removes it", async () => {
    const event = await db.event.create({
      data: { name: `${tag} Event`, slug: `${tag}-ev`, startsAt: new Date(), endsAt: new Date(Date.now() + 3.6e6), status: "PUBLISHED" },
    });
    const artist = await db.artistProfile.create({ data: { stageName: `${tag} DJ`, type: "DJ", askingFeePaise: 5000000 } });

    const booking = await createBooking(S, event.id, artist.id);
    expect(booking.agreedFeePaise).toBe(5000000); // defaulted from asking fee

    // set a time but still INQUIRY → no schedule item yet
    await updateBooking(S, booking.id, { setStartsAt: new Date(Date.now() + 1.8e6), setEndsAt: new Date(Date.now() + 5.4e6), stageOrZone: "Main", published: true });
    let b = await db.artistBooking.findUnique({ where: { id: booking.id } });
    expect(b?.scheduleItemId).toBeNull();

    // confirm → schedule item created + linked
    await setBookingStatus(S, booking.id, "CONFIRMED");
    b = await db.artistBooking.findUnique({ where: { id: booking.id } });
    expect(b?.scheduleItemId).toBeTruthy();
    const si = await db.scheduleItem.findUnique({ where: { id: b!.scheduleItemId! } });
    expect(si?.performer).toBe(`${tag} DJ`);
    expect(si?.eventId).toBe(event.id);

    // payouts → settlement UNPAID → PARTIAL → PAID (each is a TALENT expense feeding P&L)
    await recordPayout(S, booking.id, { amountPaise: 2000000, status: "PAID" });
    expect((await db.artistBooking.findUnique({ where: { id: booking.id } }))?.settlement).toBe("PARTIAL");
    await recordPayout(S, booking.id, { amountPaise: 3000000, status: "PAID" });
    expect((await db.artistBooking.findUnique({ where: { id: booking.id } }))?.settlement).toBe("PAID");
    const talent = await db.expense.aggregate({ where: { artistBookingId: booking.id, category: "TALENT" }, _sum: { amountPaise: true } });
    expect(talent._sum.amountPaise).toBe(5000000); // both payouts recorded as TALENT expenses

    // cancel → schedule item removed + unlinked
    await setBookingStatus(S, booking.id, "CANCELLED");
    b = await db.artistBooking.findUnique({ where: { id: booking.id } });
    expect(b?.scheduleItemId).toBeNull();
    expect(await db.scheduleItem.findUnique({ where: { id: si!.id } })).toBeNull();
  }, 30000);
});
