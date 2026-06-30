ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "targeting" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "stats" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "customContacts" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappTemplateName" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappTemplateLang" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whatsappTemplateParams" JSONB;

ALTER TABLE "Outbox" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
CREATE INDEX IF NOT EXISTS "Outbox_campaignId_idx" ON "Outbox"("campaignId");

DO $$
BEGIN
  ALTER TABLE "Outbox"
    ADD CONSTRAINT "Outbox_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "Suppression" (
  "contact" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Suppression_pkey" PRIMARY KEY ("contact")
);
