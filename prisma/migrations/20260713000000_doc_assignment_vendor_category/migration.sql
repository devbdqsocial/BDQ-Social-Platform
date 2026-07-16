-- AlterTable
ALTER TABLE "DocAssignment" ADD COLUMN "vendorCategory" TEXT;

-- The event-default contract slot must exclude category-scoped rows too
DROP INDEX "DocAssignment_contract_event_default";
CREATE UNIQUE INDEX "DocAssignment_contract_event_default"
  ON "DocAssignment"("eventId")
  WHERE "kind" = 'BOOKING_CONTRACT' AND "stallTypeId" IS NULL AND "vendorCategory" IS NULL;

-- one contract per vendor category per event
CREATE UNIQUE INDEX "DocAssignment_contract_per_category"
  ON "DocAssignment"("eventId", "vendorCategory")
  WHERE "kind" = 'BOOKING_CONTRACT' AND "vendorCategory" IS NOT NULL;
