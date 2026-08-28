CREATE TABLE "ai_weekly_digests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "summary" VARCHAR(3000) NOT NULL,
    "highlights" JSONB,
    "risks" JSONB,
    "recommendations" JSONB,
    "metrics" JSONB NOT NULL,
    "sourceType" VARCHAR(40) NOT NULL,
    "modelName" VARCHAR(120),
    "status" VARCHAR(40) NOT NULL DEFAULT 'SUCCEEDED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_weekly_digests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_weekly_digests_organizationId_weekStartDate_weekEndDate_key"
ON "ai_weekly_digests"("organizationId", "weekStartDate", "weekEndDate");

CREATE INDEX "ai_weekly_digests_organizationId_idx" ON "ai_weekly_digests"("organizationId");
CREATE INDEX "ai_weekly_digests_weekStartDate_idx" ON "ai_weekly_digests"("weekStartDate");
CREATE INDEX "ai_weekly_digests_status_idx" ON "ai_weekly_digests"("status");

ALTER TABLE "ai_weekly_digests"
ADD CONSTRAINT "ai_weekly_digests_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
