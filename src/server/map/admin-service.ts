import "server-only";
import { db } from "@/server/db";
import { ACTIVE_BOOKING_STATUSES } from "@/server/bookings/status";

/** Admin stall inventory for an event: each sellable stall + its type, status, and assigned vendor. */
export function listStallsForEvent(eventId: string) {
  return db.stall.findMany({
    where: { eventId, kind: "STALL" },
    orderBy: { label: "asc" },
    select: {
      id: true,
      label: true,
      status: true,
      widthFt: true,
      heightFt: true,
      priceInPaise: true,
      stallType: { select: { name: true } },
      bookings: {
        where: { status: { in: ACTIVE_BOOKING_STATUSES } },
        select: { status: true, vendorProfile: { select: { brandName: true } } },
        take: 1,
      },
    },
  });
}
