-- Event archive snapshot (nullable JSON). Additive + idempotent.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "archiveJson" JSONB;
