-- Persist purchased line items on the order so fulfilment knows which tickets to issue.
ALTER TABLE "Order" ADD COLUMN "items" JSONB;
