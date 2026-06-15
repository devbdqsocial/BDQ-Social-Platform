-- R6.3 Happening Strip (additive): manual heartbeat items the admin schedules. Schedule + offers are
-- merged at query time, not stored here. No drops.

-- CreateEnum
CREATE TYPE "HappeningKind" AS ENUM ('LIVE_NOW', 'STARTING_SOON', 'OFFER', 'ANNOUNCEMENT', 'SPONSOR', 'ACTIVITY', 'WORKSHOP', 'PERFORMANCE', 'FACILITY');

-- CreateTable
CREATE TABLE "HappeningItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "HappeningKind" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "emoji" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "href" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HappeningItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HappeningItem_eventId_published_archived_idx" ON "HappeningItem"("eventId", "published", "archived");

-- AddForeignKey
ALTER TABLE "HappeningItem" ADD CONSTRAINT "HappeningItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
