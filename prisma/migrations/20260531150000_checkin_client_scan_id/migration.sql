-- Dedupe offline check-in re-syncs by a client-generated scan id. See Docs/project.md §16.
ALTER TABLE "CheckIn" ADD COLUMN "clientScanId" TEXT;
CREATE UNIQUE INDEX "CheckIn_clientScanId_key" ON "CheckIn"("clientScanId");
