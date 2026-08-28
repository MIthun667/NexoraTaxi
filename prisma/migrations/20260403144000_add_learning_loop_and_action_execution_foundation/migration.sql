DO $$
BEGIN
  CREATE TYPE "ActionApprovalStatus" AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ActionExecutionType" AS ENUM (
    'RETRY_SHOPIFY_SYNC',
    'RETRY_STRIPE_SYNC',
    'RECONNECT_STORE',
    'TRIGGER_DATA_REFRESH',
    'ESCALATE_ISSUE',
    'MARK_RESOLVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ActionOutcomeType" AS ENUM (
    'POSITIVE',
    'NEUTRAL',
    'NEGATIVE',
    'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ActionExecutionStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ActionExecutionStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "ActionExecutionStatus" ADD VALUE IF NOT EXISTS 'EXECUTING';
ALTER TYPE "ActionExecutionStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

CREATE TABLE IF NOT EXISTS "action_executions" (
  "id" UUID NOT NULL,
  "proposalId" UUID,
  "organizationId" UUID NOT NULL,
  "type" "ActionExecutionType" NOT NULL,
  "status" "ActionExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "approvalStatus" "ActionApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedByUserId" UUID,
  "approvedByUserId" UUID,
  "executedAt" TIMESTAMP(3),
  "result" JSONB,
  "error" VARCHAR(1000),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "action_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "action_executions_proposalId_idx"
ON "action_executions"("proposalId");

CREATE INDEX IF NOT EXISTS "action_executions_organizationId_idx"
ON "action_executions"("organizationId");

CREATE INDEX IF NOT EXISTS "action_executions_status_idx"
ON "action_executions"("status");

CREATE INDEX IF NOT EXISTS "action_executions_type_idx"
ON "action_executions"("type");

DO $$
BEGIN
  ALTER TABLE "action_executions"
    ADD CONSTRAINT "action_executions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "action_executions"
    ADD CONSTRAINT "action_executions_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "action_proposals"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "action_executions"
    ADD CONSTRAINT "action_executions_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "action_executions"
    ADD CONSTRAINT "action_executions_approvedByUserId_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "action_execution_audit" (
  "id" UUID NOT NULL,
  "executionId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "actorUserId" UUID,
  "previousStatus" VARCHAR(40),
  "newStatus" VARCHAR(40),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_execution_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "action_execution_audit_executionId_idx"
ON "action_execution_audit"("executionId");

CREATE INDEX IF NOT EXISTS "action_execution_audit_organizationId_createdAt_idx"
ON "action_execution_audit"("organizationId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "action_execution_audit"
    ADD CONSTRAINT "action_execution_audit_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "action_executions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "action_execution_audit"
    ADD CONSTRAINT "action_execution_audit_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "action_outcomes" (
  "id" UUID NOT NULL,
  "executionId" UUID NOT NULL,
  "proposalId" UUID,
  "recommendationId" UUID,
  "organizationId" UUID NOT NULL,
  "outcomeType" "ActionOutcomeType" NOT NULL DEFAULT 'UNKNOWN',
  "outcomeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impactMetrics" JSONB,
  "notes" VARCHAR(1000),
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "action_outcomes_executionId_key"
ON "action_outcomes"("executionId");

CREATE INDEX IF NOT EXISTS "action_outcomes_organizationId_idx"
ON "action_outcomes"("organizationId");

CREATE INDEX IF NOT EXISTS "action_outcomes_proposalId_idx"
ON "action_outcomes"("proposalId");

CREATE INDEX IF NOT EXISTS "action_outcomes_recommendationId_idx"
ON "action_outcomes"("recommendationId");

DO $$
BEGIN
  ALTER TABLE "action_outcomes"
    ADD CONSTRAINT "action_outcomes_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "action_executions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "action_outcomes"
    ADD CONSTRAINT "action_outcomes_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "decision_logs" (
  "id" UUID NOT NULL,
  "proposalId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "decision" VARCHAR(40) NOT NULL,
  "decidedByUserId" UUID,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" VARCHAR(1000),
  "metadata" JSONB,
  CONSTRAINT "decision_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "decision_logs_organizationId_idx"
ON "decision_logs"("organizationId");

CREATE INDEX IF NOT EXISTS "decision_logs_proposalId_idx"
ON "decision_logs"("proposalId");

DO $$
BEGIN
  ALTER TABLE "decision_logs"
    ADD CONSTRAINT "decision_logs_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "action_proposals"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "decision_logs"
    ADD CONSTRAINT "decision_logs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "decision_logs"
    ADD CONSTRAINT "decision_logs_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
