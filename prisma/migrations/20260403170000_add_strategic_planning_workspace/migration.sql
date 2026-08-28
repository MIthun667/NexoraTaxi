CREATE TYPE "StrategicPlanningWindow" AS ENUM ('CURRENT_CYCLE', 'NEXT_30_DAYS', 'NEXT_QUARTER');
CREATE TYPE "StrategicPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "StrategicPriorityCategory" AS ENUM ('REVENUE', 'CUSTOMERS', 'INTEGRATIONS', 'OPERATIONS', 'TRUST', 'PAYMENTS', 'CATALOG');
CREATE TYPE "StrategicPriorityStatus" AS ENUM ('IDENTIFIED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');
CREATE TYPE "StrategicPriorityUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "strategic_plans" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdByUserId" UUID,
  "title" VARCHAR(255) NOT NULL,
  "planningWindow" "StrategicPlanningWindow" NOT NULL,
  "status" "StrategicPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "summary" VARCHAR(2000),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategic_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "strategic_priorities" (
  "id" UUID NOT NULL,
  "strategicPlanId" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "category" "StrategicPriorityCategory" NOT NULL,
  "status" "StrategicPriorityStatus" NOT NULL DEFAULT 'IDENTIFIED',
  "urgency" "StrategicPriorityUrgency" NOT NULL DEFAULT 'MEDIUM',
  "linkedSignals" JSONB,
  "linkedRecommendations" JSONB,
  "linkedProposals" JSONB,
  "linkedScenarios" JSONB,
  "linkedExecutions" JSONB,
  "linkedAgentRuns" JSONB,
  "linkedOutcomeSummary" JSONB,
  "successCriteria" JSONB,
  "owner" VARCHAR(255),
  "targetDate" TIMESTAMP(3),
  "notes" VARCHAR(2000),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategic_priorities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "strategic_plans_organizationId_idx" ON "strategic_plans"("organizationId");
CREATE INDEX "strategic_plans_organizationId_planningWindow_idx" ON "strategic_plans"("organizationId", "planningWindow");
CREATE INDEX "strategic_plans_status_idx" ON "strategic_plans"("status");

CREATE INDEX "strategic_priorities_strategicPlanId_idx" ON "strategic_priorities"("strategicPlanId");
CREATE INDEX "strategic_priorities_category_idx" ON "strategic_priorities"("category");
CREATE INDEX "strategic_priorities_status_idx" ON "strategic_priorities"("status");
CREATE INDEX "strategic_priorities_urgency_idx" ON "strategic_priorities"("urgency");

ALTER TABLE "strategic_plans"
  ADD CONSTRAINT "strategic_plans_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategic_plans"
  ADD CONSTRAINT "strategic_plans_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategic_priorities"
  ADD CONSTRAINT "strategic_priorities_strategicPlanId_fkey"
  FOREIGN KEY ("strategicPlanId") REFERENCES "strategic_plans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
