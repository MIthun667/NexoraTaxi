CREATE TYPE "StrategicReviewWindow" AS ENUM ('LAST_7_DAYS', 'CURRENT_WEEK', 'LAST_30_DAYS');

CREATE TABLE "strategic_review_reports" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "strategicPlanId" UUID,
  "reviewWindow" "StrategicReviewWindow" NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "summary" VARCHAR(2000),
  "trustSnapshot" JSONB,
  "priorityProgress" JSONB,
  "signalChanges" JSONB,
  "actionReview" JSONB,
  "outcomeReview" JSONB,
  "scenarioNotes" JSONB,
  "executiveFocus" JSONB,
  "limitations" JSONB,
  "metadata" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "strategic_review_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "strategic_review_reports_organizationId_reviewWindow_generatedAt_idx"
ON "strategic_review_reports"("organizationId", "reviewWindow", "generatedAt");

CREATE INDEX "strategic_review_reports_strategicPlanId_generatedAt_idx"
ON "strategic_review_reports"("strategicPlanId", "generatedAt");

ALTER TABLE "strategic_review_reports"
ADD CONSTRAINT "strategic_review_reports_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "strategic_review_reports"
ADD CONSTRAINT "strategic_review_reports_strategicPlanId_fkey"
FOREIGN KEY ("strategicPlanId")
REFERENCES "strategic_plans"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
