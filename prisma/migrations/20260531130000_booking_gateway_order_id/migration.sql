-- Map a Razorpay order to a stall Booking (webhook fulfilment lookup). See Docs/SCHEMA.md.
ALTER TABLE "Booking" ADD COLUMN "gatewayOrderId" TEXT;
CREATE UNIQUE INDEX "Booking_gatewayOrderId_key" ON "Booking"("gatewayOrderId");
