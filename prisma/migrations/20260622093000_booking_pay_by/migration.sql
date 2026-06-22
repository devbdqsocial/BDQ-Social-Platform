-- Add vendor payment deadline state used by booking approval flow.

ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT' AFTER 'PENDING';

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "payBy" TIMESTAMP(3);
