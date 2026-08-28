import {
  AgentCategory,
  AgentFeedbackSourceType,
  AgentTriggerType,
  NotificationStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

import { deterministicUuid } from '../seed/utils';
import {
  ACTION_TYPES,
  actorTypes,
  agentRunStatuses,
  confidenceLevels,
  decisionTypes,
  defaultOccurredAt,
  feedbackTypes,
  inferenceStatuses,
  notificationCategories,
  notificationSeverities,
  observationTypes,
  processingStatuses,
  proposalStatuses,
  riskLevels,
  triggerActions,
  triggerExecutionStatuses,
  verificationStatuses,
  verificationTypes,
} from './helpers';
import type { AiActivitySeedResult, CoreSeedContext } from './types';

const tableExists = async (prisma: PrismaClient, tableName: string): Promise<boolean> => {
  const result = await prisma.$queryRaw<Array<{ exists: string | null }>>(
    Prisma.sql`SELECT to_regclass(${`public.${tableName}`})::text AS exists`,
  );

  return Boolean(result[0]?.exists);
};

const AGENT_DEFINITION_BLUEPRINTS = [
  {
    code: 'incident-triage-agent',
    name: 'Incident Triage Agent',
    category: AgentCategory.OPERATIONS,
    description: 'Evaluates critical incidents and recommends immediate operational responses.',
  },
  {
    code: 'shift-coverage-agent',
    name: 'Shift Coverage Agent',
    category: AgentCategory.DISPATCH,
    description: 'Monitors shift coverage gaps and proposes staffing corrections.',
  },
  {
    code: 'asset-readiness-agent',
    name: 'Asset Readiness Agent',
    category: AgentCategory.FLEET,
    description: 'Tracks maintenance and readiness risk across operational assets.',
  },
  {
    code: 'executive-brief-agent',
    name: 'Executive Brief Agent',
    category: AgentCategory.SYSTEM,
    description: 'Generates leadership summaries and cross-functional risk briefs.',
  },
] as const;

export const seedAiActivity = async (
  context: CoreSeedContext & {
    workOrderIds: string[];
    incidentIds: string[];
    shiftIds: string[];
    assetIds: string[];
    workforceIds: string[];
  },
): Promise<AiActivitySeedResult> => {
  const { prisma, organizationId, users, workOrderIds, incidentIds, shiftIds, assetIds, workforceIds, now } = context;
  const actorIds = users.slice(0, 12).map((user) => user.id);

  const agentDefinitions = AGENT_DEFINITION_BLUEPRINTS.map((definition) => ({
    id: deterministicUuid(`agent-definition:${definition.code}`),
    code: definition.code,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    isActive: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }));

  await prisma.agentDefinition.createMany({ data: agentDefinitions });

  const policyRules = ACTION_TYPES.map((actionType, index) => ({
    id: deterministicUuid(`agent-policy:${actionType}`),
    agentDefinitionId: agentDefinitions[index % agentDefinitions.length]?.id ?? null,
    actionType,
    riskLevel: riskLevels[index % riskLevels.length],
    requiresApproval: index % 2 === 0,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
  }));

  await prisma.agentPolicyRule.createMany({ data: policyRules });

  const agentRuns = Array.from({ length: 18 }, (_, index) => {
    const entityFamily = index % 5;
    const entityType =
      entityFamily === 0
        ? 'work-order'
        : entityFamily === 1
          ? 'operational-incident'
          : entityFamily === 2
            ? 'schedule-shift'
            : entityFamily === 3
              ? 'asset'
              : 'workforce-member';
    const entityId =
      entityFamily === 0
        ? workOrderIds[index % workOrderIds.length] ?? null
        : entityFamily === 1
          ? incidentIds[index % incidentIds.length] ?? null
          : entityFamily === 2
            ? shiftIds[index % shiftIds.length] ?? null
            : entityFamily === 3
              ? assetIds[index % assetIds.length] ?? null
              : workforceIds[index % workforceIds.length] ?? null;
    const startedAt = defaultOccurredAt(index);
    const status = agentRunStatuses[index % agentRunStatuses.length];

    return {
      id: deterministicUuid(`agent-run:${index + 1}`),
      organizationId,
      agentDefinitionId: agentDefinitions[index % agentDefinitions.length].id,
      triggeredByUserId: actorIds[index % actorIds.length] ?? null,
      triggerType:
        index % 2 === 0 ? AgentTriggerType.EVENT_DRIVEN : AgentTriggerType.MANUAL,
      triggerSource: index % 2 === 0 ? 'domain-event' : 'leadership-dashboard',
      status,
      startedAt,
      completedAt:
        status === 'FAILED' || status === 'WAITING_APPROVAL'
          ? null
          : new Date(startedAt.getTime() + (8 + (index % 7)) * 60 * 1000),
      failedAt: status === 'FAILED' ? new Date(startedAt.getTime() + 4 * 60 * 1000) : null,
      cancelledAt: null,
      summary: `Seeded ${agentDefinitions[index % agentDefinitions.length].name} run for ${entityType} monitoring.`,
      errorMessage: status === 'FAILED' ? 'Seeded downstream timeout for observability testing.' : null,
      requestId: `req-agent-${String(index + 1).padStart(4, '0')}`,
      entityType,
      entityId,
      inputContext: {
        seeded: true,
        source: 'demo-seed',
      } as Prisma.InputJsonValue,
      createdAt: startedAt,
      updatedAt: new Date(startedAt.getTime() + 5 * 60 * 1000),
    };
  });

  await prisma.agentRun.createMany({ data: agentRuns });

  const observations = agentRuns.flatMap((run, index) =>
    observationTypes.slice(0, 2).map((observationType, observationIndex) => ({
      id: deterministicUuid(`agent-observation:${run.id}:${observationIndex}`),
      agentRunId: run.id,
      observationType,
      summary: `${observationType.replace(/_/g, ' ')} captured for ${run.entityType ?? 'global'} context.`,
      metadata: { seeded: true } as Prisma.InputJsonValue,
      createdAt: new Date(run.startedAt.getTime() + observationIndex * 60 * 1000),
    })),
  );

  const decisions = agentRuns.map((run, index) => ({
    id: deterministicUuid(`agent-decision:${run.id}`),
    agentRunId: run.id,
    decisionType: decisionTypes[index % decisionTypes.length],
    summary: `Seeded structured decision for ${run.entityType ?? 'global'} with focus on operational continuity.`,
    confidence: confidenceLevels[index % confidenceLevels.length],
    metadata: {
      summary: 'Monitor, prioritize, and verify',
      seeded: true,
    } as Prisma.InputJsonValue,
    createdAt: new Date(run.startedAt.getTime() + 2 * 60 * 1000),
  }));

  const proposals = agentRuns.slice(0, 14).map((run, index) => ({
    id: deterministicUuid(`agent-proposal:${run.id}`),
    agentRunId: run.id,
    actionType: ACTION_TYPES[index % ACTION_TYPES.length],
    targetEntityType: run.entityType,
    targetEntityId: run.entityId,
    status: proposalStatuses[index % proposalStatuses.length],
    summary: `Seeded proposal to ${ACTION_TYPES[index % ACTION_TYPES.length].toLowerCase().replace(/_/g, ' ')}.`,
    payload: {
      seeded: true,
      targetId: run.entityId,
    } as Prisma.InputJsonValue,
    riskLevel: riskLevels[index % riskLevels.length],
    requiresApproval: index % 2 === 0,
    createdAt: new Date(run.startedAt.getTime() + 3 * 60 * 1000),
    updatedAt: new Date(run.startedAt.getTime() + 4 * 60 * 1000),
  }));

  await prisma.agentObservation.createMany({ data: observations });
  await prisma.agentDecision.createMany({ data: decisions });
  await prisma.agentActionProposal.createMany({ data: proposals });

  const verificationResults = proposals.map((proposal, index) => ({
    id: deterministicUuid(`agent-verification:${proposal.id}`),
    organizationId,
    agentRunId: proposal.agentRunId,
    actionProposalId: proposal.id,
    verificationType: verificationTypes[index % verificationTypes.length],
    expectedState: { expected: proposal.actionType, seeded: true } as Prisma.InputJsonValue,
    observedState: { observed: proposal.status, seeded: true } as Prisma.InputJsonValue,
    verificationStatus: verificationStatuses[index % verificationStatuses.length],
    summary: `Verification recorded for ${proposal.actionType}.`,
    details: { seeded: true } as Prisma.InputJsonValue,
    createdAt: addMinutes(agentRuns[index % agentRuns.length].startedAt, 9),
  }));

  await prisma.agentVerificationResult.createMany({ data: verificationResults });

  const feedback = agentRuns.slice(0, 8).map((run, index) => ({
    id: deterministicUuid(`agent-feedback:${run.id}`),
    organizationId,
    agentRunId: run.id,
    sourceType: index % 3 === 0 ? AgentFeedbackSourceType.HUMAN : AgentFeedbackSourceType.SYSTEM,
    feedbackType: feedbackTypes[index % feedbackTypes.length],
    score: 3 + (index % 3),
    comment: index % 2 === 0 ? 'Useful recommendation with clear evidence.' : 'Requires tighter prioritization.',
    createdByUserId: actorIds[index % actorIds.length] ?? null,
    createdAt: addMinutes(run.startedAt, 20),
  }));

  const evaluationResults = agentRuns.slice(0, 10).map((run, index) => ({
    id: deterministicUuid(`agent-evaluation:${run.id}`),
    organizationId,
    agentRunId: run.id,
    metricName: ['verification_success_rate', 'incident_response_improvement', 'coverage_gap_reduction'][index % 3],
    metricValue: 0.62 + index * 0.03,
    baselineValue: 0.5 + index * 0.02,
    deltaValue: 0.12 + index * 0.01,
    evaluationWindowStart: addMinutes(run.startedAt, 0),
    evaluationWindowEnd: addMinutes(run.startedAt, 180),
    summary: 'Seeded evaluation result for AI governance dashboards.',
    createdAt: addMinutes(run.startedAt, 180),
  }));

  const inferenceAuditLogs = agentRuns.map((run, index) => ({
    id: deterministicUuid(`inference-audit:${run.id}`),
    organizationId,
    agentRunId: run.id,
    actorUserId: actorIds[index % actorIds.length] ?? null,
    moduleKey: 'agents.reasoning',
    useCase: run.entityType ?? 'executive-brief',
    model: 'qwen2.5:7b-instruct',
    promptTemplateKey: 'seeded-decision-template',
    inputSummary: `Seeded retrieval context for ${run.entityType ?? 'global'} analysis.`,
    outputSummary: 'Seeded structured JSON decision.',
    rawRequest: { seeded: true } as Prisma.InputJsonValue,
    rawResponse: { seeded: true } as Prisma.InputJsonValue,
    status: inferenceStatuses[index % inferenceStatuses.length],
    latencyMs: 900 + (index % 5) * 180,
    errorMessage: inferenceStatuses[index % inferenceStatuses.length] === 'FAILED' ? 'Seeded timeout for observability demo.' : null,
    createdAt: addMinutes(run.startedAt, 6),
  }));

  const executionMetrics = agentRuns.flatMap((run, index) => [
    {
      id: deterministicUuid(`agent-metric:${run.id}:latency`),
      organizationId,
      agentRunId: run.id,
      metricType: 'run_latency_ms',
      metricValue: 1200 + index * 25,
      metricUnit: 'ms',
      metadata: { seeded: true } as Prisma.InputJsonValue,
      measuredAt: addMinutes(run.startedAt, 7),
    },
    {
      id: deterministicUuid(`agent-metric:${run.id}:confidence`),
      organizationId,
      agentRunId: run.id,
      metricType: 'decision_confidence_score',
      metricValue: 0.58 + (index % 4) * 0.1,
      metricUnit: 'score',
      metadata: { seeded: true } as Prisma.InputJsonValue,
      measuredAt: addMinutes(run.startedAt, 7),
    },
  ]);

  const policyViolations = agentRuns.slice(0, 6).map((run, index) => ({
    id: deterministicUuid(`agent-policy-violation:${run.id}`),
    organizationId,
    agentRunId: run.id,
    policyRuleId: policyRules[index % policyRules.length]?.id ?? null,
    violationType: ['OUT_OF_SCOPE', 'REQUIRES_APPROVAL', 'DUPLICATE_ESCALATION'][index % 3],
    severity: riskLevels[(index + 1) % riskLevels.length],
    description: 'Seeded policy violation for governance review.',
    metadata: { seeded: true } as Prisma.InputJsonValue,
    detectedAt: addMinutes(run.startedAt, 8),
  }));

  const impacts = agentRuns.slice(0, 10).map((run, index) => ({
    id: deterministicUuid(`agent-impact:${run.id}`),
    organizationId,
    agentRunId: run.id,
    impactType: ['coverage_gap_reduction', 'incident_triage_speed', 'asset_readiness_score'][index % 3],
    baselineValue: 0.45 + (index % 3) * 0.12,
    observedValue: 0.62 + (index % 3) * 0.11,
    delta: 0.17,
    evaluationWindowStart: run.startedAt,
    evaluationWindowEnd: addMinutes(run.startedAt, 240),
    summary: 'Seeded operational impact improvement attributed to AI guidance.',
    metadata: { seeded: true } as Prisma.InputJsonValue,
    createdAt: addMinutes(run.startedAt, 240),
  }));

  const domainEvents = agentRuns.slice(0, 20).map((run, index) => ({
    id: deterministicUuid(`domain-event:agent:${index + 1}`),
    organizationId,
    eventType: index % 2 === 0 ? 'work_order.created' : 'incident.reported',
    aggregateType: run.entityType ?? 'agent-run',
    aggregateId: run.entityId ?? run.id,
    actorType: actorTypes[index % actorTypes.length],
    actorId: actorIds[index % actorIds.length] ?? run.id,
    sourceModule: index % 2 === 0 ? 'operations' : 'incidents',
    payload: {
      seeded: true,
      sourceAgentRunId: run.id,
    } as Prisma.InputJsonValue,
    metadata: { seeded: true } as Prisma.InputJsonValue,
    triggeredByUserId: actorIds[index % actorIds.length] ?? null,
    occurredAt: addMinutes(run.startedAt, -5),
    publishedAt: addMinutes(run.startedAt, -4),
    processingStatus: processingStatuses[index % processingStatuses.length],
    correlationId: `corr-${String(index + 1).padStart(4, '0')}`,
    causationId: null,
    createdAt: addMinutes(run.startedAt, -5),
  }));

  const triggerRules = triggerActions.map((actionType, index) => ({
    id: deterministicUuid(`trigger-rule:${index + 1}`),
    organizationId,
    name: `${actionType.replace(/_/g, ' ')} Trigger ${index + 1}`,
    description: 'Seeded trigger rule for AI orchestration demo.',
    eventType: index % 2 === 0 ? 'incident.reported' : 'schedule_shift.over_capacity',
    aggregateType: index % 2 === 0 ? 'operational-incident' : 'schedule-shift',
    conditionConfig: { seeded: true } as Prisma.InputJsonValue,
    actionType,
    actionTarget: index % 2 === 0 ? 'incident-triage-agent' : 'shift-coverage-agent',
    actionConfig: { seeded: true } as Prisma.InputJsonValue,
    priority: 10 + index,
    isEnabled: true,
    cooldownSeconds: 900,
    dedupeKeyStrategy: 'eventType:aggregateId',
    createdByUserId: actorIds[index % actorIds.length] ?? null,
    metadata: { seeded: true } as Prisma.InputJsonValue,
    createdAt: now,
    updatedAt: now,
  }));

  const triggerExecutionLogs = triggerRules.map((rule, index) => ({
    id: deterministicUuid(`trigger-execution:${rule.id}`),
    triggerRuleId: rule.id,
    domainEventId: domainEvents[index % domainEvents.length]?.id ?? domainEvents[0].id,
    organizationId,
    executionStatus: triggerExecutionStatuses[index % triggerExecutionStatuses.length],
    resultSummary: 'Seeded trigger execution result.',
    workflowInstanceId: null,
    approvalRequestId: null,
    agentRunId: agentRuns[index % agentRuns.length]?.id ?? null,
    notificationId: null,
    dedupeKey: `trigger-${index + 1}`,
    startedAt: addMinutes(now, -(index + 1) * 12),
    finishedAt: addMinutes(now, -(index + 1) * 12 + 1),
    errorMessage:
      triggerExecutionStatuses[index % triggerExecutionStatuses.length] === 'FAILED'
        ? 'Seeded operations timeout.'
        : null,
    metadata: { seeded: true } as Prisma.InputJsonValue,
  }));

  const notifications = users.slice(0, 12).map((user, index) => ({
    id: deterministicUuid(`notification:ai:${index + 1}`),
    organizationId,
    recipientUserId: user.id,
    category: notificationCategories[index % notificationCategories.length],
    title: ['Coverage warning', 'Approval required', 'Incident triage alert', 'Executive brief ready'][index % 4],
    message: 'Seeded AI-driven notification for demo command centers.',
    severity: notificationSeverities[index % notificationSeverities.length],
    status: index % 3 === 0 ? NotificationStatus.READ : NotificationStatus.UNREAD,
    actionUrl: '/ai/runs',
    entityType: 'agent-run',
    entityId: agentRuns[index % agentRuns.length]?.id ?? null,
    metadata: { seeded: true } as Prisma.InputJsonValue,
    readAt: index % 3 === 0 ? addMinutes(now, -index * 4) : null,
    createdAt: addMinutes(now, -(index + 1) * 9),
    updatedAt: addMinutes(now, -(index + 1) * 9),
  }));

  await prisma.agentFeedback.createMany({ data: feedback });
  await prisma.agentEvaluationResult.createMany({ data: evaluationResults });
  await prisma.inferenceAuditLog.createMany({ data: inferenceAuditLogs });
  await prisma.agentExecutionMetric.createMany({ data: executionMetrics });
  await prisma.agentPolicyViolation.createMany({ data: policyViolations });
  await prisma.agentOperationalImpact.createMany({ data: impacts });
  const hasDomainEvents = await tableExists(prisma, 'domain_events');
  const hasTriggerRules = await tableExists(prisma, 'trigger_rules');
  const hasTriggerExecutionLogs = await tableExists(prisma, 'trigger_execution_logs');

  if (hasDomainEvents) {
    await prisma.domainEvent.createMany({ data: domainEvents });
  }

  if (hasTriggerRules) {
    await prisma.triggerRule.createMany({ data: triggerRules });
  }

  if (hasTriggerExecutionLogs && hasDomainEvents && hasTriggerRules) {
    await prisma.triggerExecutionLog.createMany({ data: triggerExecutionLogs });
  }

  await prisma.notification.createMany({ data: notifications });

  return {
    agentDefinitions: agentDefinitions.length,
    agentPolicyRules: policyRules.length,
    agentRuns: agentRuns.length,
    agentObservations: observations.length,
    agentDecisions: decisions.length,
    agentActionProposals: proposals.length,
    agentVerificationResults: verificationResults.length,
    agentFeedback: feedback.length,
    agentEvaluationResults: evaluationResults.length,
    inferenceAuditLogs: inferenceAuditLogs.length,
    executionMetrics: executionMetrics.length,
    policyViolations: policyViolations.length,
    operationalImpacts: impacts.length,
    domainEvents: hasDomainEvents ? domainEvents.length : 0,
    triggerRules: hasTriggerRules ? triggerRules.length : 0,
    triggerExecutionLogs: hasTriggerExecutionLogs && hasDomainEvents && hasTriggerRules ? triggerExecutionLogs.length : 0,
    notifications: notifications.length,
  };
};

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);
