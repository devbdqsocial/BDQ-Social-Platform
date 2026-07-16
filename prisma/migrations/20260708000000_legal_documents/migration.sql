-- CreateEnum
CREATE TYPE "LegalDocCategory" AS ENUM ('TERMS', 'PRIVACY', 'DATA_POLICY', 'EVENT_RULES', 'EVENT_POLICY', 'CONTRACT', 'GUIDELINES', 'OTHER');

-- CreateEnum
CREATE TYPE "LegalDocAudience" AS ENUM ('PUBLIC', 'CUSTOMER', 'VENDOR');

-- CreateEnum
CREATE TYPE "LegalDocStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocAssignmentKind" AS ENUM ('BOOKING_CONTRACT', 'EVENT_RULES', 'EVENT_POLICY');

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "LegalDocCategory" NOT NULL,
    "audience" "LegalDocAudience" NOT NULL DEFAULT 'PUBLIC',
    "status" "LegalDocStatus" NOT NULL DEFAULT 'DRAFT',
    "sections" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocAssignment" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stallTypeId" TEXT,
    "kind" "DocAssignmentKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_slug_key" ON "LegalDocument"("slug");

-- CreateIndex
CREATE INDEX "LegalDocument_status_audience_idx" ON "LegalDocument"("status", "audience");

-- CreateIndex
CREATE INDEX "LegalDocument_category_status_idx" ON "LegalDocument"("category", "status");

-- CreateIndex
CREATE INDEX "DocAssignment_eventId_kind_idx" ON "DocAssignment"("eventId", "kind");

-- CreateIndex
CREATE INDEX "DocAssignment_docId_idx" ON "DocAssignment"("docId");

-- AddForeignKey
ALTER TABLE "DocAssignment" ADD CONSTRAINT "DocAssignment_docId_fkey" FOREIGN KEY ("docId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocAssignment" ADD CONSTRAINT "DocAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocAssignment" ADD CONSTRAINT "DocAssignment_stallTypeId_fkey" FOREIGN KEY ("stallTypeId") REFERENCES "StallTypeDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "VendorContract" ADD COLUMN "termsSnapshot" TEXT;

-- Ambiguity guards (partial unique — same pattern as one-active-booking-per-stall):
-- one contract per stall type per event
CREATE UNIQUE INDEX "DocAssignment_contract_per_stalltype"
  ON "DocAssignment"("eventId", "stallTypeId")
  WHERE "kind" = 'BOOKING_CONTRACT' AND "stallTypeId" IS NOT NULL;

-- one event-default contract per event
CREATE UNIQUE INDEX "DocAssignment_contract_event_default"
  ON "DocAssignment"("eventId")
  WHERE "kind" = 'BOOKING_CONTRACT' AND "stallTypeId" IS NULL;

-- no duplicate rules/policy assignment of the same doc to the same event
CREATE UNIQUE INDEX "DocAssignment_doc_event_kind"
  ON "DocAssignment"("docId", "eventId", "kind")
  WHERE "stallTypeId" IS NULL;
