CREATE TABLE IF NOT EXISTS "ai_executive_summaries" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "summary" VARCHAR(2000) NOT NULL,
  "highlights" JSONB,
  "risks" JSONB,
  "recommendations" JSONB,
  "sourceType" VARCHAR(40) NOT NULL,
  "modelName" VARCHAR(120),
  "status" VARCHAR(40) NOT NULL DEFAULT 'SUCCEEDED',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_executive_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_executive_summaries_organizationId_date_key"
ON "ai_executive_summaries"("organizationId", "date");

CREATE INDEX IF NOT EXISTS "ai_executive_summaries_organizationId_idx"
ON "ai_executive_summaries"("organizationId");

CREATE INDEX IF NOT EXISTS "ai_executive_summaries_date_idx"
ON "ai_executive_summaries"("date");

CREATE INDEX IF NOT EXISTS "ai_executive_summaries_status_idx"
ON "ai_executive_summaries"("status");

DO $$
BEGIN
  ALTER TABLE "ai_executive_summaries"
    ADD CONSTRAINT "ai_executive_summaries_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
