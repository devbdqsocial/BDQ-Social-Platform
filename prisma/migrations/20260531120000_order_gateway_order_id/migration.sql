-- Map a Razorpay order to our Order (webhook fulfilment lookup). See Docs/SCHEMA.md.
ALTER TABLE "Order" ADD COLUMN "gatewayOrderId" TEXT;
CREATE UNIQUE INDEX "Order_gatewayOrderId_key" ON "Order"("gatewayOrderId");
