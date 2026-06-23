-- Artist / Talent management (additive). New enums + tables + two columns/relations.

-- Permission enum: new admin permissions
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'ARTIST_MANAGE';
ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'ARTIST_VIEW';

-- New enums
CREATE TYPE "ArtistType" AS ENUM ('MUSICIAN', 'BAND', 'DJ', 'PERFORMER', 'DANCE', 'COMEDIAN', 'SPEAKER', 'HOST_MC', 'OTHER');
CREATE TYPE "ArtistBookingStatus" AS ENUM ('INQUIRY', 'NEGOTIATING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "ArtistSettlement" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- ArtistProfile
CREATE TABLE "ArtistProfile" (
  "id" TEXT NOT NULL,
  "stageName" TEXT NOT NULL,
  "realName" TEXT,
  "type" "ArtistType" NOT NULL DEFAULT 'MUSICIAN',
  "genre" TEXT,
  "bio" TEXT,
  "city" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "email" TEXT,
  "instagram" TEXT,
  "socials" JSONB,
  "askingFeePaise" INTEGER,
  "notes" TEXT,
  "slug" TEXT,
  "publicVisible" BOOLEAN NOT NULL DEFAULT false,
  "attributionCode" TEXT,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArtistProfile_slug_key" ON "ArtistProfile"("slug");
CREATE UNIQUE INDEX "ArtistProfile_attributionCode_key" ON "ArtistProfile"("attributionCode");
CREATE INDEX "ArtistProfile_type_idx" ON "ArtistProfile"("type");

-- ArtistAsset
CREATE TABLE "ArtistAsset" (
  "id" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArtistAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArtistAsset_artistId_idx" ON "ArtistAsset"("artistId");

-- ArtistBooking
CREATE TABLE "ArtistBooking" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "status" "ArtistBookingStatus" NOT NULL DEFAULT 'INQUIRY',
  "agreedFeePaise" INTEGER NOT NULL DEFAULT 0,
  "settlement" "ArtistSettlement" NOT NULL DEFAULT 'UNPAID',
  "setStartsAt" TIMESTAMP(3),
  "setEndsAt" TIMESTAMP(3),
  "stageOrZone" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "negotiationNote" TEXT,
  "negotiationAt" TIMESTAMP(3),
  "scheduleItemId" TEXT,
  "presentedBySponsorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistBooking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArtistBooking_scheduleItemId_key" ON "ArtistBooking"("scheduleItemId");
CREATE INDEX "ArtistBooking_eventId_status_idx" ON "ArtistBooking"("eventId", "status");
CREATE INDEX "ArtistBooking_artistId_idx" ON "ArtistBooking"("artistId");

-- ArtistContract
CREATE TABLE "ArtistContract" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'SENT',
  "url" TEXT,
  "version" TEXT,
  "signerName" TEXT,
  "signerIp" TEXT,
  "signedAt" TIMESTAMP(3),
  "signToken" TEXT NOT NULL,
  CONSTRAINT "ArtistContract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArtistContract_bookingId_key" ON "ArtistContract"("bookingId");
CREATE UNIQUE INDEX "ArtistContract_signToken_key" ON "ArtistContract"("signToken");

-- Expense → optional artist payout link
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "artistBookingId" TEXT;

-- Foreign keys
ALTER TABLE "ArtistAsset" ADD CONSTRAINT "ArtistAsset_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistBooking" ADD CONSTRAINT "ArtistBooking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistBooking" ADD CONSTRAINT "ArtistBooking_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArtistBooking" ADD CONSTRAINT "ArtistBooking_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ScheduleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArtistBooking" ADD CONSTRAINT "ArtistBooking_presentedBySponsorId_fkey" FOREIGN KEY ("presentedBySponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArtistContract" ADD CONSTRAINT "ArtistContract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ArtistBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_artistBookingId_fkey" FOREIGN KEY ("artistBookingId") REFERENCES "ArtistBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
