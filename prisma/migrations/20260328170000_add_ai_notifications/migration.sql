CREATE TABLE IF NOT EXISTS "ai_notifications" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "severity" VARCHAR(20) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "relatedEntityId" VARCHAR(100),
  "relatedEntityType" VARCHAR(80),
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_notifications_organizationId_idx"
ON "ai_notifications"("organizationId");

CREATE INDEX IF NOT EXISTS "ai_notifications_isRead_idx"
ON "ai_notifications"("isRead");

CREATE INDEX IF NOT EXISTS "ai_notifications_severity_idx"
ON "ai_notifications"("severity");

CREATE INDEX IF NOT EXISTS "ai_notifications_createdAt_idx"
ON "ai_notifications"("createdAt");

DO $$
BEGIN
  ALTER TABLE "ai_notifications"
    ADD CONSTRAINT "ai_notifications_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
