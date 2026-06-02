-- One ACTIVE booking per stall (prevents double-booking under races). Prisma can't express a
-- partial unique index in schema, so it's applied here. See Docs/SCHEMA.md §4.
CREATE UNIQUE INDEX "one_active_booking_per_stall"
  ON "Booking" ("stallId")
  WHERE "status" IN ('HELD', 'PENDING', 'BOOKED');
