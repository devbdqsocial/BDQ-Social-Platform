-- Align the load-bearing booking uniqueness guard with the current vendor flow:
-- RESERVED -> PENDING_PAYMENT -> BOOKED.
DROP INDEX IF EXISTS "one_active_booking_per_stall";

CREATE UNIQUE INDEX "one_active_booking_per_stall"
  ON "Booking" ("stallId")
  WHERE "status" IN ('RESERVED', 'PENDING_PAYMENT', 'BOOKED');

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'RESERVED';
