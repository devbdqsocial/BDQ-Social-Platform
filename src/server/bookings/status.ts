import type { BookingStatus } from "@prisma/client";

export const ACTIVE_BOOKING_STATUSES = ["RESERVED", "PENDING_PAYMENT", "BOOKED"] satisfies BookingStatus[];
