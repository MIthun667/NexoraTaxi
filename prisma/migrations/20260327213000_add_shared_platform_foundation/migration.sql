DO $$
BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED', 'TERMINATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UsageMetricType" AS ENUM ('AGENT_RUNS', 'AI_TOKENS', 'CONNECTOR_CALLS', 'WORKFLOW_EXECUTIONS', 'REPORT_GENERATIONS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BillingEventType" AS ENUM ('SUBSCRIPTION_STARTED', 'SUBSCRIPTION_UPGRADED', 'SUBSCRIPTION_DOWNGRADED', 'USAGE_THRESHOLD_EXCEEDED', 'TRIAL_ENDED', 'PAYMENT_FAILED', 'PAYMENT_SUCCEEDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SystemAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SystemAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "HealthCheckStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentVerificationType" AS ENUM ('EXECUTION', 'STATE', 'POLICY', 'OUTCOME');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentVerificationStatus" AS ENUM ('PASSED', 'PARTIAL', 'FAILED', 'PENDING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentFeedbackSourceType" AS ENUM ('HUMAN', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentFeedbackType" AS ENUM ('USEFUL', 'NOT_USEFUL', 'OVERRIDE', 'CORRECTION', 'RATING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DecisionReportType" AS ENUM ('OPERATIONAL_RISK', 'INCIDENT_ESCALATION', 'STAFFING_GAP', 'ASSET_MAINTENANCE_RISK', 'EXECUTIVE_SUMMARY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ConnectorCategory" AS ENUM ('COMMUNICATION', 'CALENDAR', 'BUSINESS_SYSTEM', 'OPERATIONAL', 'STORAGE_EXPORT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ConnectorAuthType" AS ENUM ('API_KEY', 'OAUTH2', 'WEBHOOK_SECRET', 'BASIC_TOKEN', 'SERVICE_ACCOUNT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ConnectorInstanceStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR', 'PENDING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ConnectorSyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ConnectorActionLogStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DomainEventProcessingStatus" AS ENUM ('PENDING', 'PUBLISHED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DomainActorType" AS ENUM ('USER', 'AGENT', 'SYSTEM', 'SERVICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TriggerActionType" AS ENUM ('START_WORKFLOW', 'CREATE_APPROVAL', 'START_AGENT_RUN', 'SEND_NOTIFICATION', 'ENQUEUE_FOLLOWUP_TASK', 'NO_OP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TriggerExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'DUPLICATE', 'COOLDOWN_BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ActionExecutionStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED', 'DUPLICATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'WAITING_APPROVAL';
ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'ACTED';
ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'VERIFIED_SUCCESS';
ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'VERIFIED_PARTIAL';
ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'VERIFIED_FAILED';
ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';

ALTER TABLE "domain_events"
  ADD COLUMN IF NOT EXISTS "actorType" "DomainActorType",
  ADD COLUMN IF NOT EXISTS "actorId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "sourceModule" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processingStatus" "DomainEventProcessingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "correlationId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "causationId" VARCHAR(100);

ALTER TABLE "inference_audit_logs"
  ADD COLUMN IF NOT EXISTS "agentRunId" UUID;

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "description" VARCHAR(500),
  "monthlyPrice" DECIMAL(12,2) NOT NULL,
  "yearlyPrice" DECIMAL(12,2) NOT NULL,
  "featureFlags" JSONB,
  "usageLimits" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_subscriptions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "trialEndsAt" TIMESTAMP(3),
  "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "featureOverrides" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_usage" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "metricType" "UsageMetricType" NOT NULL,
  "metricValue" INTEGER NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organization_usage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_billing_events" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID,
  "eventType" "BillingEventType" NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_billing_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_alerts" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "sourceModule" VARCHAR(80) NOT NULL,
  "alertType" VARCHAR(120) NOT NULL,
  "severity" "SystemAlertSeverity" NOT NULL,
  "status" "SystemAlertStatus" NOT NULL DEFAULT 'OPEN',
  "title" VARCHAR(160) NOT NULL,
  "summary" VARCHAR(1000) NOT NULL,
  "metadata" JSONB,
  "correlationId" VARCHAR(120),
  "acknowledgedByUserId" UUID,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedByUserId" UUID,
  "resolvedAt" TIMESTAMP(3),
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "health_check_logs" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "checkType" VARCHAR(120) NOT NULL,
  "target" VARCHAR(120) NOT NULL,
  "status" "HealthCheckStatus" NOT NULL,
  "responseTimeMs" INTEGER,
  "summary" VARCHAR(500) NOT NULL,
  "metadata" JSONB,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_check_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "decision_reports" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "agentRunId" UUID NOT NULL,
  "agentDecisionId" UUID,
  "reportType" "DecisionReportType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "summary" VARCHAR(2000) NOT NULL,
  "findings" JSONB,
  "evidence" JSONB,
  "riskLevel" "AgentRiskLevel" NOT NULL,
  "recommendations" JSONB,
  "confidenceScore" DOUBLE PRECISION NOT NULL,
  "supportingData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "decision_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "connector_definitions" (
  "id" UUID NOT NULL,
  "key" VARCHAR(120) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "category" "ConnectorCategory" NOT NULL,
  "authType" "ConnectorAuthType" NOT NULL,
  "capabilities" JSONB,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "connector_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "connector_instances" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "connectorDefinitionId" UUID NOT NULL,
  "displayName" VARCHAR(160) NOT NULL,
  "status" "ConnectorInstanceStatus" NOT NULL DEFAULT 'PENDING',
  "configuration" JSONB,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "connector_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "connector_credentials" (
  "id" UUID NOT NULL,
  "connectorInstanceId" UUID NOT NULL,
  "credentialType" "ConnectorAuthType" NOT NULL,
  "encryptedSecret" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "connector_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "connector_sync_jobs" (
  "id" UUID NOT NULL,
  "connectorInstanceId" UUID NOT NULL,
  "jobType" VARCHAR(120) NOT NULL,
  "status" "ConnectorSyncJobStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "resultSummary" VARCHAR(1000),
  "metadata" JSONB,
  "checkpoint" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "connector_sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "connector_action_logs" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "connectorInstanceId" UUID NOT NULL,
  "actionType" VARCHAR(120) NOT NULL,
  "targetRef" VARCHAR(255),
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "status" "ConnectorActionLogStatus" NOT NULL DEFAULT 'PENDING',
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "connector_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_verification_results" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "agentRunId" UUID NOT NULL,
  "actionProposalId" UUID,
  "verificationType" "AgentVerificationType" NOT NULL,
  "expectedState" JSONB,
  "observedState" JSONB,
  "verificationStatus" "AgentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "summary" VARCHAR(500) NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_verification_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_feedback" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "agentRunId" UUID NOT NULL,
  "sourceType" "AgentFeedbackSourceType" NOT NULL,
  "feedbackType" "AgentFeedbackType" NOT NULL,
  "score" INTEGER,
  "comment" VARCHAR(1000),
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_evaluation_results" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "agentRunId" UUID NOT NULL,
  "metricName" VARCHAR(120) NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "baselineValue" DOUBLE PRECISION,
  "deltaValue" DOUBLE PRECISION,
  "evaluationWindowStart" TIMESTAMP(3) NOT NULL,
  "evaluationWindowEnd" TIMESTAMP(3) NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_evaluation_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_execution_metrics" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "agentRunId" UUID NOT NULL,
  "metricType" VARCHAR(120) NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "metricUnit" VARCHAR(40),
  "metadata" JSONB,
  "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_execution_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_policy_violations" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "agentRunId" UUID NOT NULL,
  "policyRuleId" UUID,
  "violationType" VARCHAR(120) NOT NULL,
  "severity" "AgentRiskLevel" NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "metadata" JSONB,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_policy_violations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_operational_impacts" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "agentRunId" UUID NOT NULL,
  "impactType" VARCHAR(120) NOT NULL,
  "baselineValue" DOUBLE PRECISION,
  "observedValue" DOUBLE PRECISION,
  "delta" DOUBLE PRECISION,
  "evaluationWindowStart" TIMESTAMP(3) NOT NULL,
  "evaluationWindowEnd" TIMESTAMP(3) NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_operational_impacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trigger_rules" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "eventType" VARCHAR(120) NOT NULL,
  "aggregateType" VARCHAR(80),
  "conditionConfig" JSONB,
  "actionType" "TriggerActionType" NOT NULL,
  "actionTarget" VARCHAR(160),
  "actionConfig" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "cooldownSeconds" INTEGER,
  "dedupeKeyStrategy" VARCHAR(120),
  "createdByUserId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trigger_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trigger_execution_logs" (
  "id" UUID NOT NULL,
  "triggerRuleId" UUID NOT NULL,
  "domainEventId" UUID NOT NULL,
  "organizationId" UUID,
  "executionStatus" "TriggerExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "resultSummary" VARCHAR(500),
  "workflowInstanceId" UUID,
  "approvalRequestId" UUID,
  "agentRunId" UUID,
  "notificationId" UUID,
  "dedupeKey" VARCHAR(200),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "errorMessage" VARCHAR(1000),
  "metadata" JSONB,
  CONSTRAINT "trigger_execution_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "action_execution_logs" (
  "id" UUID NOT NULL,
  "proposalId" UUID NOT NULL,
  "organizationId" UUID,
  "actionType" VARCHAR(120) NOT NULL,
  "executionStatus" "ActionExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "approvalRequestId" UUID,
  "executedByUserId" UUID,
  "targetEntityType" VARCHAR(80),
  "targetEntityId" VARCHAR(100),
  "resultSummary" VARCHAR(500),
  "errorMessage" VARCHAR(1000),
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "action_execution_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_key" ON "subscription_plans"("code");
CREATE INDEX IF NOT EXISTS "subscription_plans_isActive_createdAt_idx" ON "subscription_plans"("isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "organization_subscriptions_organizationId_status_createdAt_idx" ON "organization_subscriptions"("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "organization_subscriptions_planId_status_createdAt_idx" ON "organization_subscriptions"("planId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "organization_subscriptions_trialEndsAt_idx" ON "organization_subscriptions"("trialEndsAt");

CREATE UNIQUE INDEX IF NOT EXISTS "organization_usage_organizationId_metricType_periodStart_periodEnd_key" ON "organization_usage"("organizationId", "metricType", "periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS "organization_usage_organizationId_metricType_periodStart_perio_idx" ON "organization_usage"("organizationId", "metricType", "periodStart", "periodEnd");

CREATE INDEX IF NOT EXISTS "organization_billing_events_organizationId_eventType_occurredAt_idx" ON "organization_billing_events"("organizationId", "eventType", "occurredAt");
CREATE INDEX IF NOT EXISTS "organization_billing_events_subscriptionId_occurredAt_idx" ON "organization_billing_events"("subscriptionId", "occurredAt");

CREATE INDEX IF NOT EXISTS "system_alerts_organizationId_status_severity_triggeredAt_idx" ON "system_alerts"("organizationId", "status", "severity", "triggeredAt");
CREATE INDEX IF NOT EXISTS "system_alerts_sourceModule_alertType_triggeredAt_idx" ON "system_alerts"("sourceModule", "alertType", "triggeredAt");
CREATE INDEX IF NOT EXISTS "system_alerts_correlationId_idx" ON "system_alerts"("correlationId");

CREATE INDEX IF NOT EXISTS "health_check_logs_organizationId_checkType_checkedAt_idx" ON "health_check_logs"("organizationId", "checkType", "checkedAt");
CREATE INDEX IF NOT EXISTS "health_check_logs_target_status_checkedAt_idx" ON "health_check_logs"("target", "status", "checkedAt");

CREATE INDEX IF NOT EXISTS "domain_events_processingStatus_occurredAt_idx" ON "domain_events"("processingStatus", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_publishedAt_idx" ON "domain_events"("publishedAt");
CREATE INDEX IF NOT EXISTS "domain_events_correlationId_idx" ON "domain_events"("correlationId");

CREATE INDEX IF NOT EXISTS "inference_audit_logs_agentRunId_createdAt_idx" ON "inference_audit_logs"("agentRunId", "createdAt");

CREATE INDEX IF NOT EXISTS "decision_reports_organizationId_reportType_createdAt_idx" ON "decision_reports"("organizationId", "reportType", "createdAt");
CREATE INDEX IF NOT EXISTS "decision_reports_agentRunId_createdAt_idx" ON "decision_reports"("agentRunId", "createdAt");
CREATE INDEX IF NOT EXISTS "decision_reports_agentDecisionId_createdAt_idx" ON "decision_reports"("agentDecisionId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "connector_definitions_key_key" ON "connector_definitions"("key");
CREATE INDEX IF NOT EXISTS "connector_definitions_category_authType_idx" ON "connector_definitions"("category", "authType");

CREATE INDEX IF NOT EXISTS "connector_instances_organizationId_status_createdAt_idx" ON "connector_instances"("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "connector_instances_connectorDefinitionId_status_idx" ON "connector_instances"("connectorDefinitionId", "status");
CREATE INDEX IF NOT EXISTS "connector_instances_createdByUserId_createdAt_idx" ON "connector_instances"("createdByUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "connector_credentials_connectorInstanceId_credentialType_idx" ON "connector_credentials"("connectorInstanceId", "credentialType");
CREATE INDEX IF NOT EXISTS "connector_credentials_expiresAt_idx" ON "connector_credentials"("expiresAt");

CREATE INDEX IF NOT EXISTS "connector_sync_jobs_connectorInstanceId_status_createdAt_idx" ON "connector_sync_jobs"("connectorInstanceId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "connector_sync_jobs_jobType_status_createdAt_idx" ON "connector_sync_jobs"("jobType", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "connector_action_logs_organizationId_status_executedAt_idx" ON "connector_action_logs"("organizationId", "status", "executedAt");
CREATE INDEX IF NOT EXISTS "connector_action_logs_connectorInstanceId_actionType_execute_idx" ON "connector_action_logs"("connectorInstanceId", "actionType", "executedAt");
CREATE INDEX IF NOT EXISTS "connector_action_logs_targetRef_executedAt_idx" ON "connector_action_logs"("targetRef", "executedAt");

CREATE INDEX IF NOT EXISTS "agent_verification_results_organizationId_createdAt_idx" ON "agent_verification_results"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_verification_results_agentRunId_createdAt_idx" ON "agent_verification_results"("agentRunId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_verification_results_actionProposalId_createdAt_idx" ON "agent_verification_results"("actionProposalId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_verification_results_verificationType_verificationSt_idx" ON "agent_verification_results"("verificationType", "verificationStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_feedback_organizationId_createdAt_idx" ON "agent_feedback"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_feedback_agentRunId_createdAt_idx" ON "agent_feedback"("agentRunId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_feedback_sourceType_feedbackType_createdAt_idx" ON "agent_feedback"("sourceType", "feedbackType", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_evaluation_results_organizationId_createdAt_idx" ON "agent_evaluation_results"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_evaluation_results_agentRunId_createdAt_idx" ON "agent_evaluation_results"("agentRunId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_evaluation_results_metricName_createdAt_idx" ON "agent_evaluation_results"("metricName", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_execution_metrics_organizationId_measuredAt_idx" ON "agent_execution_metrics"("organizationId", "measuredAt");
CREATE INDEX IF NOT EXISTS "agent_execution_metrics_agentRunId_measuredAt_idx" ON "agent_execution_metrics"("agentRunId", "measuredAt");
CREATE INDEX IF NOT EXISTS "agent_execution_metrics_metricType_measuredAt_idx" ON "agent_execution_metrics"("metricType", "measuredAt");

CREATE INDEX IF NOT EXISTS "agent_policy_violations_organizationId_detectedAt_idx" ON "agent_policy_violations"("organizationId", "detectedAt");
CREATE INDEX IF NOT EXISTS "agent_policy_violations_agentRunId_detectedAt_idx" ON "agent_policy_violations"("agentRunId", "detectedAt");
CREATE INDEX IF NOT EXISTS "agent_policy_violations_violationType_detectedAt_idx" ON "agent_policy_violations"("violationType", "detectedAt");
CREATE INDEX IF NOT EXISTS "agent_policy_violations_severity_detectedAt_idx" ON "agent_policy_violations"("severity", "detectedAt");

CREATE INDEX IF NOT EXISTS "agent_operational_impacts_organizationId_createdAt_idx" ON "agent_operational_impacts"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_operational_impacts_agentRunId_createdAt_idx" ON "agent_operational_impacts"("agentRunId", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_operational_impacts_impactType_createdAt_idx" ON "agent_operational_impacts"("impactType", "createdAt");

CREATE INDEX IF NOT EXISTS "trigger_rules_organizationId_eventType_isEnabled_idx" ON "trigger_rules"("organizationId", "eventType", "isEnabled");
CREATE INDEX IF NOT EXISTS "trigger_rules_aggregateType_eventType_idx" ON "trigger_rules"("aggregateType", "eventType");
CREATE INDEX IF NOT EXISTS "trigger_rules_priority_isEnabled_idx" ON "trigger_rules"("priority", "isEnabled");
CREATE INDEX IF NOT EXISTS "trigger_rules_createdByUserId_idx" ON "trigger_rules"("createdByUserId");

CREATE INDEX IF NOT EXISTS "trigger_execution_logs_triggerRuleId_startedAt_idx" ON "trigger_execution_logs"("triggerRuleId", "startedAt");
CREATE INDEX IF NOT EXISTS "trigger_execution_logs_domainEventId_startedAt_idx" ON "trigger_execution_logs"("domainEventId", "startedAt");
CREATE INDEX IF NOT EXISTS "trigger_execution_logs_organizationId_startedAt_idx" ON "trigger_execution_logs"("organizationId", "startedAt");
CREATE INDEX IF NOT EXISTS "trigger_execution_logs_executionStatus_startedAt_idx" ON "trigger_execution_logs"("executionStatus", "startedAt");
CREATE INDEX IF NOT EXISTS "trigger_execution_logs_dedupeKey_startedAt_idx" ON "trigger_execution_logs"("dedupeKey", "startedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "action_execution_logs_idempotencyKey_key" ON "action_execution_logs"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "action_execution_logs_proposalId_startedAt_idx" ON "action_execution_logs"("proposalId", "startedAt");
CREATE INDEX IF NOT EXISTS "action_execution_logs_organizationId_startedAt_idx" ON "action_execution_logs"("organizationId", "startedAt");
CREATE INDEX IF NOT EXISTS "action_execution_logs_executionStatus_startedAt_idx" ON "action_execution_logs"("executionStatus", "startedAt");
CREATE INDEX IF NOT EXISTS "action_execution_logs_approvalRequestId_idx" ON "action_execution_logs"("approvalRequestId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_subscriptions_organizationId_fkey') THEN
    ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_subscriptions_planId_fkey') THEN
    ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_usage_organizationId_fkey') THEN
    ALTER TABLE "organization_usage" ADD CONSTRAINT "organization_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_billing_events_organizationId_fkey') THEN
    ALTER TABLE "organization_billing_events" ADD CONSTRAINT "organization_billing_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_billing_events_subscriptionId_fkey') THEN
    ALTER TABLE "organization_billing_events" ADD CONSTRAINT "organization_billing_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "organization_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_organizationId_fkey') THEN
    ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_acknowledgedByUserId_fkey') THEN
    ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_alerts_resolvedByUserId_fkey') THEN
    ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'health_check_logs_organizationId_fkey') THEN
    ALTER TABLE "health_check_logs" ADD CONSTRAINT "health_check_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domain_events_triggeredByUserId_fkey') THEN
    ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domain_events_organizationId_fkey') THEN
    ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inference_audit_logs_agentRunId_fkey') THEN
    ALTER TABLE "inference_audit_logs" ADD CONSTRAINT "inference_audit_logs_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_reports_organizationId_fkey') THEN
    ALTER TABLE "decision_reports" ADD CONSTRAINT "decision_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_reports_agentRunId_fkey') THEN
    ALTER TABLE "decision_reports" ADD CONSTRAINT "decision_reports_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_reports_agentDecisionId_fkey') THEN
    ALTER TABLE "decision_reports" ADD CONSTRAINT "decision_reports_agentDecisionId_fkey" FOREIGN KEY ("agentDecisionId") REFERENCES "agent_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connector_instances_organizationId_fkey') THEN
    ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connector_instances_connectorDefinitionId_fkey') THEN
    ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_connectorDefinitionId_fkey" FOREIGN KEY ("connectorDefinitionId") REFERENCES "connector_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connector_instances_createdByUserId_fkey') THEN
    ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connector_credentials_connectorInstanceId_fkey') THEN
    ALTER TABLE "connector_credentials" ADD CONSTRAINT "connector_credentials_connectorInstanceId_fkey" FOREIGN KEY ("connectorInstanceId") REFERENCES "connector_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connector_sync_jobs_connectorInstanceId_fkey') THEN
    ALTER TABLE "connector_sync_jobs" ADD CONSTRAINT "connector_sync_jobs_connectorInstanceId_fkey" FOREIGN KEY ("connectorInstanceId") REFERENCES "connector_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connector_action_logs_organizationId_fkey') THEN
    ALTER TABLE "connector_action_logs" ADD CONSTRAINT "connector_action_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connector_action_logs_connectorInstanceId_fkey') THEN
    ALTER TABLE "connector_action_logs" ADD CONSTRAINT "connector_action_logs_connectorInstanceId_fkey" FOREIGN KEY ("connectorInstanceId") REFERENCES "connector_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_verification_results_agentRunId_fkey') THEN
    ALTER TABLE "agent_verification_results" ADD CONSTRAINT "agent_verification_results_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_verification_results_actionProposalId_fkey') THEN
    ALTER TABLE "agent_verification_results" ADD CONSTRAINT "agent_verification_results_actionProposalId_fkey" FOREIGN KEY ("actionProposalId") REFERENCES "agent_action_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_feedback_agentRunId_fkey') THEN
    ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_evaluation_results_agentRunId_fkey') THEN
    ALTER TABLE "agent_evaluation_results" ADD CONSTRAINT "agent_evaluation_results_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_execution_metrics_organizationId_fkey') THEN
    ALTER TABLE "agent_execution_metrics" ADD CONSTRAINT "agent_execution_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_execution_metrics_agentRunId_fkey') THEN
    ALTER TABLE "agent_execution_metrics" ADD CONSTRAINT "agent_execution_metrics_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_policy_violations_organizationId_fkey') THEN
    ALTER TABLE "agent_policy_violations" ADD CONSTRAINT "agent_policy_violations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_policy_violations_agentRunId_fkey') THEN
    ALTER TABLE "agent_policy_violations" ADD CONSTRAINT "agent_policy_violations_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_policy_violations_policyRuleId_fkey') THEN
    ALTER TABLE "agent_policy_violations" ADD CONSTRAINT "agent_policy_violations_policyRuleId_fkey" FOREIGN KEY ("policyRuleId") REFERENCES "agent_policy_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_operational_impacts_organizationId_fkey') THEN
    ALTER TABLE "agent_operational_impacts" ADD CONSTRAINT "agent_operational_impacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_operational_impacts_agentRunId_fkey') THEN
    ALTER TABLE "agent_operational_impacts" ADD CONSTRAINT "agent_operational_impacts_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
