-- CreateEnum
CREATE TYPE "AddOnOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "addOnOrderId" TEXT;

-- CreateTable
CREATE TABLE "StallAddOn" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "maxPerBooking" INTEGER NOT NULL DEFAULT 5,
    "stock" INTEGER,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StallAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAddOnOrder" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "AddOnOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "gatewayOrderId" TEXT,
    "totalPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingAddOnOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAddOn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,

    CONSTRAINT "BookingAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_addOnOrderId_key" ON "Payment"("addOnOrderId");

-- CreateIndex
CREATE INDEX "StallAddOn_eventId_idx" ON "StallAddOn"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAddOnOrder_gatewayOrderId_key" ON "BookingAddOnOrder"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "BookingAddOnOrder_bookingId_idx" ON "BookingAddOnOrder"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAddOn_orderId_idx" ON "BookingAddOn"("orderId");

-- CreateIndex
CREATE INDEX "BookingAddOn_addOnId_idx" ON "BookingAddOn"("addOnId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_addOnOrderId_fkey" FOREIGN KEY ("addOnOrderId") REFERENCES "BookingAddOnOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StallAddOn" ADD CONSTRAINT "StallAddOn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOnOrder" ADD CONSTRAINT "BookingAddOnOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BookingAddOnOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "StallAddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
