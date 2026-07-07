-- Vendor-targeted in-app notifications (portal bell). Admin rows keep vendorProfileId NULL.
ALTER TABLE "Notification" ADD COLUMN "vendorProfileId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_vendorProfileId_createdAt_idx" ON "Notification"("vendorProfileId", "createdAt");
