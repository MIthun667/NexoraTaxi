CREATE TABLE IF NOT EXISTS "ai_signals" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "severity" VARCHAR(20) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "metadata" JSONB,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_signals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_insights" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "explanation" VARCHAR(2000) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_daily_summaries" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "summary" VARCHAR(1000) NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_daily_summaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_signals_organizationId_idx"
ON "ai_signals"("organizationId");

CREATE INDEX IF NOT EXISTS "ai_signals_type_idx"
ON "ai_signals"("type");

CREATE INDEX IF NOT EXISTS "ai_signals_severity_idx"
ON "ai_signals"("severity");

CREATE INDEX IF NOT EXISTS "ai_signals_isActive_idx"
ON "ai_signals"("isActive");

CREATE INDEX IF NOT EXISTS "ai_signals_detectedAt_idx"
ON "ai_signals"("detectedAt");

CREATE INDEX IF NOT EXISTS "ai_insights_organizationId_idx"
ON "ai_insights"("organizationId");

CREATE INDEX IF NOT EXISTS "ai_insights_category_idx"
ON "ai_insights"("category");

CREATE INDEX IF NOT EXISTS "ai_insights_createdAt_idx"
ON "ai_insights"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ai_daily_summaries_organizationId_date_key"
ON "ai_daily_summaries"("organizationId", "date");

CREATE INDEX IF NOT EXISTS "ai_daily_summaries_organizationId_idx"
ON "ai_daily_summaries"("organizationId");

CREATE INDEX IF NOT EXISTS "ai_daily_summaries_date_idx"
ON "ai_daily_summaries"("date");

DO $$
BEGIN
  ALTER TABLE "ai_signals"
    ADD CONSTRAINT "ai_signals_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ai_insights"
    ADD CONSTRAINT "ai_insights_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ai_daily_summaries"
    ADD CONSTRAINT "ai_daily_summaries_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
