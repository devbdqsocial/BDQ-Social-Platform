-- CreateEnum
CREATE TYPE "OfferKind" AS ENUM ('DISCOUNT', 'FREEBIE', 'BUNDLE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ENDED');

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "sponsorId" TEXT,
    "title" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "kind" "OfferKind" NOT NULL DEFAULT 'DISCOUNT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_eventId_status_endsAt_idx" ON "Offer"("eventId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "Offer_vendorProfileId_idx" ON "Offer"("vendorProfileId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
