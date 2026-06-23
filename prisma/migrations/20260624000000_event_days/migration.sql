-- Multi-day event scheduling (additive). New EventDay table + ScheduleItem.eventDayId.

-- EventDay
CREATE TABLE IF NOT EXISTS "EventDay" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "label" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "EventDay_pkey" PRIMARY KEY ("id")
);

-- ScheduleItem.eventDayId
ALTER TABLE "ScheduleItem" ADD COLUMN IF NOT EXISTS "eventDayId" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "EventDay_eventId_idx" ON "EventDay"("eventId");
CREATE INDEX IF NOT EXISTS "ScheduleItem_eventDayId_idx" ON "ScheduleItem"("eventDayId");

-- Foreign keys (guarded — no ADD CONSTRAINT IF NOT EXISTS in Postgres)
DO $$ BEGIN
  ALTER TABLE "EventDay" ADD CONSTRAINT "EventDay_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_eventDayId_fkey"
    FOREIGN KEY ("eventDayId") REFERENCES "EventDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
