import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { addDay, recomputeEventWindow } from "./event-days";
import { addScheduleItem, deleteScheduleItem } from "./service";
import { createBooking, updateBooking, setBookingStatus } from "@/server/artists/bookings-service";
import type { Session } from "@/server/auth/guard";

// Exercises multi-day windows + run-of-show against a real DB. Skipped unless RUN_DB_TESTS=1.
const db = new PrismaClient();
const S: Session = { userId: "admin_seed", role: "SUPER_ADMIN", permissions: [] };
const tag = `daytest_${Date.now()}`;

describe.runIf(process.env.RUN_DB_TESTS === "1")("event days + run-of-show", () => {
  afterAll(async () => {
    await db.event.deleteMany({ where: { slug: { startsWith: tag } } }); // cascades days, schedule, bookings
    await db.artistProfile.deleteMany({ where: { stageName: { startsWith: tag } } });
    await db.$disconnect();
  });

  it("days recompute the event envelope; artist sets bucket into the right day; artist sets are delete-guarded", async () => {
    const event = await db.event.create({
      data: { name: `${tag} Fest`, slug: `${tag}-ev`, startsAt: new Date("2026-10-30T16:00:00+05:30"), endsAt: new Date("2026-10-30T23:00:00+05:30"), status: "PUBLISHED" },
    });

    const d1 = await addDay(S, event.id, { startsAt: new Date("2026-10-30T16:00:00+05:30"), endsAt: new Date("2026-10-30T23:00:00+05:30"), label: "Day 1" });
    await addDay(S, event.id, { startsAt: new Date("2026-11-01T16:00:00+05:30"), endsAt: new Date("2026-11-02T00:30:00+05:30"), label: "Day 3" });
    await recomputeEventWindow(event.id);

    const ev = await db.event.findUnique({ where: { id: event.id }, select: { startsAt: true, endsAt: true } });
    expect(ev!.startsAt.toISOString()).toBe(new Date("2026-10-30T16:00:00+05:30").toISOString()); // min day start
    expect(ev!.endsAt.toISOString()).toBe(new Date("2026-11-02T00:30:00+05:30").toISOString()); // max day end

    // manual item on day 1 → deletable
    const manual = await addScheduleItem(S, event.id, { startsAt: new Date("2026-10-30T18:00:00+05:30"), title: `${tag} food court`, eventDayId: d1.id });
    await deleteScheduleItem(S, manual.id);
    expect(await db.scheduleItem.findUnique({ where: { id: manual.id } })).toBeNull();

    // artist set at 00:15 on 2 Nov → buckets into Day 3 (overnight window), and is delete-guarded
    const artist = await db.artistProfile.create({ data: { stageName: `${tag} DJ`, type: "DJ" } });
    const booking = await createBooking(S, event.id, artist.id);
    await updateBooking(S, booking.id, { setStartsAt: new Date("2026-11-02T00:15:00+05:30"), setEndsAt: null, stageOrZone: "Main", published: true });
    await setBookingStatus(S, booking.id, "CONFIRMED");

    const synced = await db.artistBooking.findUnique({ where: { id: booking.id }, select: { scheduleItemId: true } });
    const si = await db.scheduleItem.findUnique({ where: { id: synced!.scheduleItemId! }, select: { id: true, eventDay: { select: { label: true } } } });
    expect(si!.eventDay?.label).toBe("Day 3");

    await expect(deleteScheduleItem(S, si!.id)).rejects.toThrow(/Lineup/);
    expect(await db.scheduleItem.findUnique({ where: { id: si!.id } })).not.toBeNull(); // still there
  }, 30000);
});
