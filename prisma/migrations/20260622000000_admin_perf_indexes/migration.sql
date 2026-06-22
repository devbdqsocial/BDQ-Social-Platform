-- Admin performance indexes (additive). Speeds up finance/check-in dashboard aggregates.
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "CheckIn_direction_scannedAt_idx" ON "CheckIn"("direction", "scannedAt");
