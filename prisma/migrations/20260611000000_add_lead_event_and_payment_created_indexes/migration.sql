-- Perf indexes: vendor lead exports filter by event; payment reconciliation scans by date.
-- IF NOT EXISTS keeps this tolerant of dev/prod drift (local DB evolved via db push).
CREATE INDEX IF NOT EXISTS "Lead_eventId_idx" ON "Lead"("eventId");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");
