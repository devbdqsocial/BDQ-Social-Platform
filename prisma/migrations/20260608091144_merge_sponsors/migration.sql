/*
  Warnings:

  - You are about to drop the `Sponsorship` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Sponsorship" DROP CONSTRAINT "Sponsorship_eventId_fkey";

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "amountPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "SponsorshipStatus" NOT NULL DEFAULT 'PROPOSED';

-- Transfer data from Sponsorship to Sponsor
INSERT INTO "Sponsor" ("id", "eventId", "name", "tier", "amountPaise", "status", "paidAt", "note")
SELECT
  'sp_' || id,
  COALESCE("eventId", (SELECT id FROM "Event" LIMIT 1)),
  "sponsorName",
  'ASSOCIATE'::"SponsorTier",
  "amountPaise",
  "status",
  "paidAt",
  "note"
FROM "Sponsorship"
WHERE "eventId" IS NOT NULL OR (SELECT COUNT(*) FROM "Event") > 0
ON CONFLICT DO NOTHING;

-- DropTable
DROP TABLE "Sponsorship";
