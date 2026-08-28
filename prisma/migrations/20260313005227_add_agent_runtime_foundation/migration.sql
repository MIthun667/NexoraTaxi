-- CreateEnum
CREATE TYPE "InferenceStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'TIMEOUT', 'VALIDATION_FAILED');

-- CreateEnum
CREATE TYPE "AgentCategory" AS ENUM ('OPERATIONS', 'APPROVALS', 'DISPATCH', 'DRIVERS', 'FLEET', 'COMPLIANCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AgentTriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'EVENT_DRIVEN', 'API');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentObservationType" AS ENUM ('CONTEXT_GATHERED', 'METRIC_ANALYZED', 'ENTITY_EVALUATED', 'POLICY_CHECKED', 'EXTERNAL_SIGNAL');

-- CreateEnum
CREATE TYPE "AgentDecisionType" AS ENUM ('SUMMARY', 'RECOMMENDATION', 'RISK_ASSESSMENT', 'PRIORITIZATION', 'ESCALATION_SUGGESTION');

-- CreateEnum
CREATE TYPE "AgentActionProposalStatus" AS ENUM ('PROPOSED', 'APPROVAL_REQUIRED', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AgentConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "inference_audit_logs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "actorUserId" UUID,
    "moduleKey" VARCHAR(80) NOT NULL,
    "useCase" VARCHAR(120) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "promptTemplateKey" VARCHAR(120) NOT NULL,
    "inputSummary" VARCHAR(2000) NOT NULL,
    "outputSummary" VARCHAR(2000),
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "status" "InferenceStatus" NOT NULL,
    "latencyMs" INTEGER,
    "errorMessage" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inference_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_definitions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "category" "AgentCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "agentDefinitionId" UUID NOT NULL,
    "triggeredByUserId" UUID,
    "triggerType" "AgentTriggerType" NOT NULL DEFAULT 'API',
    "triggerSource" VARCHAR(120),
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "summary" VARCHAR(1000),
    "errorMessage" VARCHAR(1000),
    "requestId" VARCHAR(100),
    "entityType" VARCHAR(80),
    "entityId" VARCHAR(100),
    "inputContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_observations" (
    "id" UUID NOT NULL,
    "agentRunId" UUID NOT NULL,
    "observationType" "AgentObservationType" NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_decisions" (
    "id" UUID NOT NULL,
    "agentRunId" UUID NOT NULL,
    "decisionType" "AgentDecisionType" NOT NULL,
    "summary" VARCHAR(1000) NOT NULL,
    "confidence" "AgentConfidenceLevel" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_action_proposals" (
    "id" UUID NOT NULL,
    "agentRunId" UUID NOT NULL,
    "actionType" VARCHAR(120) NOT NULL,
    "targetEntityType" VARCHAR(80),
    "targetEntityId" VARCHAR(100),
    "status" "AgentActionProposalStatus" NOT NULL DEFAULT 'PROPOSED',
    "summary" VARCHAR(1000) NOT NULL,
    "payload" JSONB,
    "riskLevel" "AgentRiskLevel" NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_action_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_policy_rules" (
    "id" UUID NOT NULL,
    "agentDefinitionId" UUID,
    "actionType" VARCHAR(120) NOT NULL,
    "riskLevel" "AgentRiskLevel" NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inference_audit_logs_organizationId_createdAt_idx" ON "inference_audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "inference_audit_logs_actorUserId_createdAt_idx" ON "inference_audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "inference_audit_logs_moduleKey_useCase_createdAt_idx" ON "inference_audit_logs"("moduleKey", "useCase", "createdAt");

-- CreateIndex
CREATE INDEX "inference_audit_logs_status_createdAt_idx" ON "inference_audit_logs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_definitions_category_isActive_idx" ON "agent_definitions"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "agent_definitions_code_key" ON "agent_definitions"("code");

-- CreateIndex
CREATE INDEX "agent_runs_organizationId_status_createdAt_idx" ON "agent_runs"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_runs_agentDefinitionId_status_createdAt_idx" ON "agent_runs"("agentDefinitionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_runs_triggeredByUserId_createdAt_idx" ON "agent_runs"("triggeredByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_runs_requestId_idx" ON "agent_runs"("requestId");

-- CreateIndex
CREATE INDEX "agent_runs_entityType_entityId_idx" ON "agent_runs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "agent_observations_agentRunId_createdAt_idx" ON "agent_observations"("agentRunId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_observations_observationType_createdAt_idx" ON "agent_observations"("observationType", "createdAt");

-- CreateIndex
CREATE INDEX "agent_decisions_agentRunId_createdAt_idx" ON "agent_decisions"("agentRunId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_decisions_decisionType_createdAt_idx" ON "agent_decisions"("decisionType", "createdAt");

-- CreateIndex
CREATE INDEX "agent_action_proposals_agentRunId_status_createdAt_idx" ON "agent_action_proposals"("agentRunId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_action_proposals_actionType_riskLevel_idx" ON "agent_action_proposals"("actionType", "riskLevel");

-- CreateIndex
CREATE INDEX "agent_action_proposals_targetEntityType_targetEntityId_idx" ON "agent_action_proposals"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "agent_policy_rules_agentDefinitionId_actionType_isEnabled_idx" ON "agent_policy_rules"("agentDefinitionId", "actionType", "isEnabled");

-- CreateIndex
CREATE INDEX "agent_policy_rules_actionType_isEnabled_idx" ON "agent_policy_rules"("actionType", "isEnabled");

-- AddForeignKey
ALTER TABLE "inference_audit_logs" ADD CONSTRAINT "inference_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inference_audit_logs" ADD CONSTRAINT "inference_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "agent_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_observations" ADD CONSTRAINT "agent_observations_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_action_proposals" ADD CONSTRAINT "agent_action_proposals_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_policy_rules" ADD CONSTRAINT "agent_policy_rules_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
