import {
  ActionExecutionStatus,
  AgentActionProposalStatus,
  AgentCategory,
  AgentConfidenceLevel,
  AgentDecisionType,
  AgentRiskLevel,
  AgentRunStatus,
  AgentTriggerType,
  AgentVerificationStatus,
  AgentVerificationType,
  DecisionReportType,
  Prisma,
  PrismaClient,
  TriggerActionType,
  TriggerExecutionStatus,
} from '@prisma/client';

import { deterministicGlobalSeedUuid, deterministicPackUuid } from './deterministic-id';

export type AiPlatformEnrichmentProfile = 'saas' | 'logistics' | 'revops';

export type AiPlatformEnrichmentResult = {
  agentDefinitions: number;
  agentPolicyRules: number;
  agentRuns: number;
  agentDecisions: number;
  agentActionProposals: number;
  agentVerificationResults: number;
  decisionReports: number;
  triggerRules: number;
  triggerExecutionLogs: number;
  actionExecutionLogs: number;
};

const AGENT_DEFINITIONS = [
  {
    code: 'workflow-risk-agent',
    name: 'Workflow Risk Agent',
    description: 'Reviews workflow risk and recommends operational actions.',
    category: AgentCategory.OPERATIONS,
  },
  {
    code: 'connector-health-agent',
    name: 'Connector Health Agent',
    description: 'Monitors shared connector health and recommends follow-up.',
    category: AgentCategory.SYSTEM,
  },
  {
    code: 'approval-guidance-agent',
    name: 'Approval Guidance Agent',
    description: 'Summarizes approval context and proposes safe next actions.',
    category: AgentCategory.APPROVALS,
  },
] as const;

const PROFILE_SCENARIO: Record<
  AiPlatformEnrichmentProfile,
  {
    agentCode: (typeof AGENT_DEFINITIONS)[number]['code'];
    entityType: string;
    decisionType: AgentDecisionType;
    reportType: DecisionReportType;
    triggerEventType: string;
    actionType: string;
    triggerActionType: TriggerActionType;
    title: string;
    summary: string;
  }
> = {
  saas: {
    agentCode: 'workflow-risk-agent',
    entityType: 'ticket',
    decisionType: AgentDecisionType.PRIORITIZATION,
    reportType: DecisionReportType.EXECUTIVE_SUMMARY,
    triggerEventType: 'product.feature.approval_ready',
    actionType: 'SEND_ESCALATION_BRIEF',
    triggerActionType: TriggerActionType.SEND_NOTIFICATION,
    title: 'Customer escalation risk summary',
    summary: 'AI flagged elevated escalation risk across support and product handoffs.',
  },
  logistics: {
    agentCode: 'workflow-risk-agent',
    entityType: 'work_order',
    decisionType: AgentDecisionType.RISK_ASSESSMENT,
    reportType: DecisionReportType.STAFFING_GAP,
    triggerEventType: 'operations.coverage_gap.detected',
    actionType: 'ESCALATE_READINESS_REVIEW',
    triggerActionType: TriggerActionType.CREATE_APPROVAL,
    title: 'Scheduling and readiness risk summary',
    summary: 'AI highlighted scheduling and readiness risk in field operations.',
  },
  revops: {
    agentCode: 'approval-guidance-agent',
    entityType: 'deal',
    decisionType: AgentDecisionType.RECOMMENDATION,
    reportType: DecisionReportType.EXECUTIVE_SUMMARY,
    triggerEventType: 'revops.discount.requested',
    actionType: 'CREATE_APPROVAL_SUMMARY',
    triggerActionType: TriggerActionType.CREATE_APPROVAL,
    title: 'Discount approval guidance summary',
    summary: 'AI summarized discount risk and recommended approval posture.',
  },
};

export const seedAiPlatformEnrichment = async (
  prisma: PrismaClient,
  input: {
    packNamespace: string;
    organizationId: string;
    profile: AiPlatformEnrichmentProfile;
    now: Date;
    actorUserId?: string | null;
    domainEventIds: string[];
    approvalRequestIds: string[];
    workOrderIds: string[];
    incidentIds: string[];
    notificationIds: string[];
  },
): Promise<AiPlatformEnrichmentResult> => {
  await prisma.agentDefinition.createMany({
    data: AGENT_DEFINITIONS.map((definition) => ({
      id: deterministicGlobalSeedUuid(`enrichment:agent-definition:${definition.code}`),
      code: definition.code,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      isActive: true,
      version: 1,
    })),
    skipDuplicates: true,
  });

  const policyRows = AGENT_DEFINITIONS.map((definition, index) => ({
    id: deterministicGlobalSeedUuid(`enrichment:agent-policy:${definition.code}`),
    agentDefinitionId: deterministicGlobalSeedUuid(`enrichment:agent-definition:${definition.code}`),
    actionType:
      index === 0
        ? 'SEND_ESCALATION_BRIEF'
        : index === 1
          ? 'SYNC_CONNECTOR_STATUS'
          : 'CREATE_APPROVAL_SUMMARY',
    riskLevel: index === 2 ? AgentRiskLevel.HIGH : AgentRiskLevel.MEDIUM,
    requiresApproval: index !== 1,
    isEnabled: true,
  }));

  await prisma.agentPolicyRule.createMany({ data: policyRows, skipDuplicates: true });

  const scenario = PROFILE_SCENARIO[input.profile];
  const agentDefinitionId = deterministicGlobalSeedUuid(
    `enrichment:agent-definition:${scenario.agentCode}`,
  );
  const agentRunId = deterministicPackUuid(input.packNamespace, 'enrichment:agent-run');
  const agentDecisionId = deterministicPackUuid(input.packNamespace, 'enrichment:agent-decision');
  const actionProposalId = deterministicPackUuid(input.packNamespace, 'enrichment:agent-proposal');
  const verificationId = deterministicPackUuid(input.packNamespace, 'enrichment:agent-verification');
  const decisionReportId = deterministicPackUuid(input.packNamespace, 'enrichment:decision-report');
  const triggerRuleId = deterministicPackUuid(input.packNamespace, 'enrichment:trigger-rule');
  const triggerExecutionLogId = deterministicPackUuid(
    input.packNamespace,
    'enrichment:trigger-execution',
  );
  const actionExecutionLogId = deterministicPackUuid(
    input.packNamespace,
    'enrichment:action-execution',
  );

  const entityId =
    input.workOrderIds[0] ??
    input.incidentIds[0] ??
    input.approvalRequestIds[0] ??
    input.domainEventIds[0] ??
    null;

  await prisma.agentRun.createMany({
    data: [
      {
        id: agentRunId,
        organizationId: input.organizationId,
        agentDefinitionId,
        triggeredByUserId: input.actorUserId ?? null,
        triggerType: AgentTriggerType.EVENT_DRIVEN,
        triggerSource: scenario.triggerEventType,
        status: AgentRunStatus.VERIFIED_SUCCESS,
        startedAt: new Date(input.now.getTime() - 45 * 60 * 1000),
        completedAt: new Date(input.now.getTime() - 39 * 60 * 1000),
        summary: scenario.summary,
        requestId: `${input.packNamespace}-agent-run`,
        entityType: scenario.entityType,
        entityId,
        inputContext: {
          seeded: true,
          profile: input.profile,
        } as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.agentDecision.createMany({
    data: [
      {
        id: agentDecisionId,
        agentRunId,
        decisionType: scenario.decisionType,
        summary: scenario.summary,
        confidence: AgentConfidenceLevel.HIGH,
        metadata: {
          seeded: true,
          source: 'seed-pack-enrichment',
        } as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.agentActionProposal.createMany({
    data: [
      {
        id: actionProposalId,
        agentRunId,
        actionType: scenario.actionType,
        targetEntityType: scenario.entityType,
        targetEntityId: entityId,
        status: AgentActionProposalStatus.APPROVED,
        summary: scenario.summary,
        payload: {
          seeded: true,
          profile: input.profile,
        } as Prisma.InputJsonValue,
        riskLevel: AgentRiskLevel.MEDIUM,
        requiresApproval: true,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.agentVerificationResult.createMany({
    data: [
      {
        id: verificationId,
        organizationId: input.organizationId,
        agentRunId,
        actionProposalId,
        verificationType: AgentVerificationType.OUTCOME,
        expectedState: {
          expectedAction: scenario.actionType,
        } as Prisma.InputJsonValue,
        observedState: {
          status: 'aligned',
        } as Prisma.InputJsonValue,
        verificationStatus: AgentVerificationStatus.PASSED,
        summary: 'Seeded verification for pack-specific AI enrichment.',
        details: {
          seeded: true,
        } as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.decisionReport.createMany({
    data: [
      {
        id: decisionReportId,
        organizationId: input.organizationId,
        agentRunId,
        agentDecisionId,
        reportType: scenario.reportType,
        title: scenario.title,
        summary: scenario.summary,
        findings: {
          seeded: true,
          profile: input.profile,
        } as Prisma.InputJsonValue,
        evidence: {
          entityId,
          eventType: scenario.triggerEventType,
        } as Prisma.InputJsonValue,
        riskLevel: AgentRiskLevel.MEDIUM,
        recommendations: {
          action: scenario.actionType,
        } as Prisma.InputJsonValue,
        confidenceScore: 0.87,
        supportingData: {
          seeded: true,
        } as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.triggerRule.createMany({
    data: [
      {
        id: triggerRuleId,
        organizationId: input.organizationId,
        name: `${scenario.title} Trigger`,
        description: `Pack-aware automation trigger for ${input.profile}.`,
        eventType: scenario.triggerEventType,
        aggregateType: scenario.entityType,
        conditionConfig: {
          seeded: true,
          profile: input.profile,
        } as Prisma.InputJsonValue,
        actionType: scenario.triggerActionType,
        actionTarget: scenario.actionType,
        actionConfig: {
          seeded: true,
          profile: input.profile,
        } as Prisma.InputJsonValue,
        priority: 100,
        isEnabled: true,
        dedupeKeyStrategy: 'event-plus-entity',
        createdByUserId: input.actorUserId ?? null,
        metadata: {
          seeded: true,
          source: 'seed-pack-enrichment',
        } as Prisma.InputJsonValue,
      },
    ],
    skipDuplicates: true,
  });

  if (input.domainEventIds[0]) {
    await prisma.triggerExecutionLog.createMany({
      data: [
        {
          id: triggerExecutionLogId,
          triggerRuleId,
          domainEventId: input.domainEventIds[0],
          organizationId: input.organizationId,
          executionStatus: TriggerExecutionStatus.SUCCEEDED,
          resultSummary: `Trigger executed for ${scenario.triggerEventType}.`,
          approvalRequestId: input.approvalRequestIds[0] ?? null,
          agentRunId,
          notificationId: input.notificationIds[0] ?? null,
          dedupeKey: `${input.packNamespace}:${scenario.triggerEventType}`,
          startedAt: new Date(input.now.getTime() - 35 * 60 * 1000),
          finishedAt: new Date(input.now.getTime() - 34 * 60 * 1000),
          metadata: {
            seeded: true,
            profile: input.profile,
          } as Prisma.InputJsonValue,
        },
      ],
      skipDuplicates: true,
    });
  }

  await prisma.actionExecutionLog.createMany({
    data: [
      {
        id: actionExecutionLogId,
        proposalId: actionProposalId,
        organizationId: input.organizationId,
        actionType: scenario.actionType,
        executionStatus: ActionExecutionStatus.SUCCEEDED,
        idempotencyKey: `${input.packNamespace}:${scenario.actionType}`,
        approvalRequestId: input.approvalRequestIds[0] ?? null,
        executedByUserId: input.actorUserId ?? null,
        targetEntityType: scenario.entityType,
        targetEntityId: entityId,
        resultSummary: `Executed ${scenario.actionType} for ${scenario.entityType}.`,
        metadata: {
          seeded: true,
          profile: input.profile,
        } as Prisma.InputJsonValue,
        startedAt: new Date(input.now.getTime() - 32 * 60 * 1000),
        finishedAt: new Date(input.now.getTime() - 31 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  return {
    agentDefinitions: AGENT_DEFINITIONS.length,
    agentPolicyRules: policyRows.length,
    agentRuns: 1,
    agentDecisions: 1,
    agentActionProposals: 1,
    agentVerificationResults: 1,
    decisionReports: 1,
    triggerRules: 1,
    triggerExecutionLogs: input.domainEventIds[0] ? 1 : 0,
    actionExecutionLogs: 1,
  };
};
