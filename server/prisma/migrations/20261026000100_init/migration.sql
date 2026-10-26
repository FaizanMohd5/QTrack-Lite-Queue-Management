CREATE TYPE "QueueEntryStatus" AS ENUM ('WAITING', 'SERVING', 'DONE', 'NO_SHOW');

CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "ownerPasswordHash" TEXT NOT NULL,
    "isQueueOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QueueDay" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "lastTokenNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueueDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "publicTokenHash" TEXT NOT NULL,
    "queueDayId" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "status" "QueueEntryStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
CREATE UNIQUE INDEX "QueueDay_shopId_serviceDate_key" ON "QueueDay"("shopId", "serviceDate");
CREATE INDEX "QueueDay_shopId_serviceDate_idx" ON "QueueDay"("shopId", "serviceDate");
CREATE UNIQUE INDEX "QueueEntry_publicTokenHash_key" ON "QueueEntry"("publicTokenHash");
CREATE UNIQUE INDEX "QueueEntry_queueDayId_tokenNumber_key" ON "QueueEntry"("queueDayId", "tokenNumber");
CREATE INDEX "QueueEntry_queueDayId_status_createdAt_idx" ON "QueueEntry"("queueDayId", "status", "createdAt");
CREATE INDEX "QueueEntry_queueDayId_normalizedPhone_status_idx" ON "QueueEntry"("queueDayId", "normalizedPhone", "status");
CREATE UNIQUE INDEX "QueueEntry_one_active_phone" ON "QueueEntry"("queueDayId", "normalizedPhone") WHERE "status" IN ('WAITING', 'SERVING');
CREATE UNIQUE INDEX "QueueEntry_one_serving" ON "QueueEntry"("queueDayId") WHERE "status" = 'SERVING';

ALTER TABLE "QueueDay" ADD CONSTRAINT "QueueDay_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_queueDayId_fkey" FOREIGN KEY ("queueDayId") REFERENCES "QueueDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
