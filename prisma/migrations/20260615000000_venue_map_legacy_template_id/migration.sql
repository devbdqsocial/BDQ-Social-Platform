-- R5.5 Phase 3 (additive): provenance column on the canonical venue model (EventMap = VenueMap).
-- Records which legacy LayoutTemplate a VenueMap was folded from. Nullable; no drops, no data loss.

-- AlterTable
ALTER TABLE "EventMap" ADD COLUMN "legacyTemplateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EventMap_legacyTemplateId_key" ON "EventMap"("legacyTemplateId");
