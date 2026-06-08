-- CreateEnum
CREATE TYPE "WaitlistSource" AS ENUM ('PLATFORM', 'EVENT');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('VENUE', 'MARKETING', 'STAFF', 'SECURITY', 'LOGISTICS', 'PRODUCTION', 'TALENT', 'FNB', 'PERMIT', 'VENDOR_PAYOUT', 'MISC');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "ExpenseCadence" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('PROPOSED', 'SIGNED', 'PAID');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('RECONCILED', 'UNMATCHED');

-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'FINANCE_MANAGE';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "mapId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "feePaise" INTEGER,
ADD COLUMN     "taxPaise" INTEGER;

-- AlterTable
ALTER TABLE "Waitlist" ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "source" "WaitlistSource" NOT NULL DEFAULT 'EVENT',
ALTER COLUMN "eventId" DROP NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'TICKET';

-- CreateTable
CREATE TABLE "LayoutTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layoutJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapElement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STALL',
    "widthFt" DOUBLE PRECISION NOT NULL,
    "heightFt" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL,
    "sellable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMap" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'FT',
    "widthFt" DOUBLE PRECISION NOT NULL,
    "heightFt" DOUBLE PRECISION NOT NULL,
    "gridFt" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "layoutJson" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "vendorProfileId" TEXT,
    "title" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "receiptUrl" TEXT,
    "note" TEXT,
    "scheduleId" TEXT,
    "recordedById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "plannedPaise" INTEGER NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSchedule" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "cadence" "ExpenseCadence" NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "remaining" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsorship" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "sponsorName" TEXT NOT NULL,
    "tier" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'PROPOSED',
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "gatewayRef" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "feePaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'UNMATCHED',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "eventId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "eventId" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "subject" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_eventId_category_idx" ON "Expense"("eventId", "category");

-- CreateIndex
CREATE INDEX "Expense_eventId_incurredAt_idx" ON "Expense"("eventId", "incurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_eventId_category_key" ON "Budget"("eventId", "category");

-- CreateIndex
CREATE INDEX "ExpenseSchedule_active_nextRunAt_idx" ON "ExpenseSchedule"("active", "nextRunAt");

-- CreateIndex
CREATE INDEX "Sponsorship_eventId_status_idx" ON "Sponsorship"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_gatewayRef_key" ON "Settlement"("gatewayRef");

-- CreateIndex
CREATE INDEX "Settlement_settledAt_idx" ON "Settlement"("settledAt");

-- CreateIndex
CREATE INDEX "Notification_readAt_createdAt_idx" ON "Notification"("readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_eventId_idx" ON "Notification"("eventId");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "Waitlist_source_idx" ON "Waitlist"("source");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExpenseSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSchedule" ADD CONSTRAINT "ExpenseSchedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
