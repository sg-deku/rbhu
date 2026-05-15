-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('user', 'scheduler');

-- AlterTable: Add provider to SyncLog (populate from Integration, then set NOT NULL)
ALTER TABLE "SyncLog" ADD COLUMN "provider" "IntegrationProvider";
UPDATE "SyncLog" sl SET "provider" = i."provider" FROM "Integration" i WHERE sl."integrationId" = i."id";
ALTER TABLE "SyncLog" ALTER COLUMN "provider" SET NOT NULL;

-- AlterTable: Add triggeredBy to SyncLog
ALTER TABLE "SyncLog" ADD COLUMN "triggeredBy" "SyncTrigger" NOT NULL DEFAULT 'user';

-- AlterTable: Add contentType to DocumentMetadata (populate with default, then set NOT NULL)
ALTER TABLE "DocumentMetadata" ADD COLUMN "contentType" TEXT;
UPDATE "DocumentMetadata" SET "contentType" = 'unknown' WHERE "contentType" IS NULL;
ALTER TABLE "DocumentMetadata" ALTER COLUMN "contentType" SET NOT NULL;

-- AlterTable: Add metadata to DocumentMetadata
ALTER TABLE "DocumentMetadata" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- DropIndex
DROP INDEX "DocumentMetadata_provider_externalId_key";

-- CreateIndex
CREATE UNIQUE INDEX "DocumentMetadata_integrationId_externalId_key" ON "DocumentMetadata"("integrationId", "externalId");

-- CreateIndex
CREATE INDEX "DocumentMetadata_lastSyncedAt_idx" ON "DocumentMetadata"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "DocumentMetadata_contentType_idx" ON "DocumentMetadata"("contentType");
