-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('APPROVAL', 'WORKFLOW', 'DRIVER', 'FLEET', 'DISPATCH', 'INCIDENT', 'COMPLIANCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "domain_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "eventType" VARCHAR(120) NOT NULL,
    "aggregateType" VARCHAR(80) NOT NULL,
    "aggregateId" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "triggeredByUserId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "recipientUserId" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "actionUrl" VARCHAR(255),
    "entityType" VARCHAR(80),
    "entityId" VARCHAR(100),
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domain_events_organizationId_occurredAt_idx" ON "domain_events"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "domain_events_eventType_occurredAt_idx" ON "domain_events"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "domain_events_aggregateType_aggregateId_idx" ON "domain_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "domain_events_triggeredByUserId_occurredAt_idx" ON "domain_events"("triggeredByUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_status_createdAt_idx" ON "notifications"("recipientUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_organizationId_category_createdAt_idx" ON "notifications"("organizationId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_severity_status_createdAt_idx" ON "notifications"("severity", "status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_entityType_entityId_idx" ON "notifications"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
