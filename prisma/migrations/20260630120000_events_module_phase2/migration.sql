-- Events module batch (additive). Event logistics fields, Lead→Booking attribution,
-- and the per-booking BookingAgreement. Idempotent so it can be applied to both Neon DBs safely.

-- Event: add-on close window + vendor load-in/setup window
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "addOnCloseHours" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "loadInStartsAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "loadInEndsAt" TIMESTAMP(3);

-- Lead → Booking attribution
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;
CREATE INDEX IF NOT EXISTS "Lead_bookingId_idx" ON "Lead"("bookingId");

DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-booking (per-event) agreement
CREATE TABLE IF NOT EXISTS "BookingAgreement" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'SENT',
  "version" TEXT,
  "termsSnapshot" TEXT,
  "signerName" TEXT,
  "signerIp" TEXT,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingAgreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingAgreement_bookingId_key" ON "BookingAgreement"("bookingId");

DO $$ BEGIN
  ALTER TABLE "BookingAgreement" ADD CONSTRAINT "BookingAgreement_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
