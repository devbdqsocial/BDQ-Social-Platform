-- CreateEnum
CREATE TYPE "VendorDocStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "VendorDoc" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "status" "VendorDocStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorDoc_vendorProfileId_docType_key" ON "VendorDoc"("vendorProfileId", "docType");

-- AddForeignKey
ALTER TABLE "VendorDoc" ADD CONSTRAINT "VendorDoc_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
