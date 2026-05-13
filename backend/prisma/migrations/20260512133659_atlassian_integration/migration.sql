/*
  Warnings:

  - You are about to drop the `JiraIntegration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "JiraIntegration" DROP CONSTRAINT "JiraIntegration_userId_fkey";

-- CreateTable
CREATE TABLE "AtlassianIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cloudId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "jiraEnabled" BOOLEAN NOT NULL DEFAULT false,
    "confluenceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "AtlassianIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtlassianIntegration_userId_cloudId_key" ON "AtlassianIntegration"("userId", "cloudId");

-- AddForeignKey
ALTER TABLE "AtlassianIntegration" ADD CONSTRAINT "AtlassianIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: Copy existing JiraIntegration rows into AtlassianIntegration with jiraEnabled = true
INSERT INTO "AtlassianIntegration" ("id", "userId", "cloudId", "siteUrl", "accessToken", "refreshToken", "jiraEnabled", "confluenceEnabled", "createdAt", "updatedAt")
SELECT
    "id",
    "userId",
    "cloudId",
    '' AS "siteUrl",
    "accessToken",
    "refreshToken",
    true AS "jiraEnabled",
    false AS "confluenceEnabled",
    "createdAt",
    "updatedAt"
FROM "JiraIntegration";

-- DropTable
DROP TABLE "JiraIntegration";
