import {
  AgentActionProposalStatus,
  AgentConfidenceLevel,
  AgentDecisionType,
  AgentObservationType,
  AgentRunStatus,
  AgentTriggerType,
  DispatchIncidentSeverity,
  NotificationCategory,
  NotificationSeverity,
  Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { RequestContextStorage } from '../../common/utils/request-context.util';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { AiObservabilityService } from '../governance/ai-observability.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { UNIVERSAL_RETRIEVAL_ENTITY_TYPES } from '../retrieval/retrieval.constants';
import { AgentContextService } from './agent-context.service';
import { AgentPolicyService, ProposedAgentActionInput } from './agent-policy.service';
import { AgentRegistryService } from './agent-registry.service';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { ReasoningService } from './reasoning/reasoning.service';
import { AgentReasoningResult } from './reasoning/reasoning.types';
import { ReviewAgentActionProposalDto } from './dto/review-agent-action-proposal.dto';
import { ReportGeneratorService } from '../reports/report-generator.service';
import { PlanEnforcementService } from '../tenancy/plan-enforcement.service';
import { UsageMeterService } from '../tenancy/usage-meter.service';
import { AlertingService } from '../observability/alerting.service';
import { IncidentMonitorService } from '../observability/incident-monitor.service';
import { ActionTypes } from '../actions/action.constants';
import { FeedbackCaptureService } from './verification/feedback-capture.service';
import { AgentExecutionService } from './execution.service';
import { CommerceHealthAgent } from './commerce-health.agent';
import { RevenueMonitorAgent } from './revenue-monitor.agent';
import { CustomerMomentumAgent } from './customer-momentum.agent';
import { IntegrationGuardAgent } from './integration-guard.agent';
import { CommerceAgentContext, CommerceAgentOutput } from './commerce-agent.types';

@Injectable()
export class AgentRunnerService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly aiObservabilityService: AiObservabilityService,
    private readonly agentRegistryService: AgentRegistryService,
    private readonly agentContextService: AgentContextService,
    private readonly agentPolicyService: AgentPolicyService,
    private readonly intelligenceService: IntelligenceService,
    private readonly domainEventsService: DomainEventsService,
    private readonly reasoningService: ReasoningService,
    private readonly reportGeneratorService: ReportGeneratorService,
    private readonly planEnforcementService: PlanEnforcementService,
    private readonly usageMeterService: UsageMeterService,
    private readonly alertingService: AlertingService,
    private readonly incidentMonitorService: IncidentMonitorService,
    private readonly feedbackCaptureService: FeedbackCaptureService,
    private readonly agentExecutionService: AgentExecutionService,
    private readonly commerceHealthAgent: CommerceHealthAgent,
    private readonly revenueMonitorAgent: RevenueMonitorAgent,
    private readonly customerMomentumAgent: CustomerMomentumAgent,
    private readonly integrationGuardAgent: IntegrationGuardAgent,
  ) {}

  async createRun(principal: CurrentPrincipal, dto: CreateAgentRunDto) {
    return this.createRunInternal(principal, dto, 'admin-center');
  }

  async createAutomatedRun(
    dto: CreateAgentRunDto,
    triggerSource: string,
  ) {
    return this.createRunInternal(null, dto, triggerSource);
  }

  private async createRunInternal(
    principal: CurrentPrincipal | null,
    dto: CreateAgentRunDto,
    triggerSource: string,
  ) {
    if (principal && principal.organizationId !== dto.organizationId) {
      throw new BadRequestException('Cross-organization agent runs are not permitted.');
    }

    const organizationId = await this.agentContextService.ensureOrganizationScope(
      dto.organizationId,
    );
    if (!dto.agentCode) {
      throw new BadRequestException('An agent code is required for direct agent runs.');
    }
    const definition = await this.agentRegistryService.resolveActiveDefinitionByCode(
      dto.agentCode,
    );
    await this.planEnforcementService.assertFeatureEnabled(organizationId, 'ai_agents');
    await this.planEnforcementService.assertUsageAllowed(organizationId, 'AGENT_RUNS', 1);
    const requestId = RequestContextStorage.getRequestId() ?? null;
    const executionPrincipal = principal ?? this.buildSystemPrincipal(organizationId);
    const triggeredByUserId =
      principal && principal.userId.trim().length > 0 ? principal.userId : null;

    const run = await this.prismaService.agentRun.create({
      data: {
        organizationId,
        agentDefinitionId: definition.id,
        triggeredByUserId,
        triggerType: dto.triggerType ?? AgentTriggerType.API,
        triggerSource,
        status: AgentRunStatus.RUNNING,
        requestId,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        inputContext:
          (dto.inputContext as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
      select: { id: true },
    });

    await this.aiObservabilityService.recordRunStarted({
      organizationId,
      agentRunId: run.id,
    });

    try {
      const context = await this.agentContextService.buildContext({
        principal: executionPrincipal,
        agentCode: definition.code,
        entityId: dto.entityId,
        entityType: dto.entityType,
        inputContext: dto.inputContext,
        organizationId,
      });

      await this.prismaService.agentRun.update({
        where: { id: run.id },
        data: {
          inputContext: {
            requestedInput:
              (dto.inputContext as Prisma.InputJsonValue | undefined) ?? null,
            contextSnapshot: context.payload as Prisma.InputJsonValue,
          },
        },
      });

      await this.prismaService.agentObservation.create({
        data: {
          agentRunId: run.id,
          observationType: AgentObservationType.CONTEXT_GATHERED,
          summary: `Agent context prepared for ${definition.name}.`,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      });

      const result = await this.executeAgent(
        definition,
        executionPrincipal,
        run.id,
        context,
        dto.inputContext,
      );
      const proposals = await Promise.all(
        (result.proposals ?? []).map((proposal) =>
          this.agentPolicyService.evaluate(definition.id, proposal),
        ),
      );
      const confidenceMetric = result.decisions?.length
        ? result.decisions.reduce((acc, item) => {
            const normalized =
              item.confidence === AgentConfidenceLevel.HIGH
                ? 0.9
                : item.confidence === AgentConfidenceLevel.MEDIUM
                  ? 0.6
                  : 0.3;
            return acc + normalized;
          }, 0) / result.decisions.length
        : null;

      await this.prismaService.$transaction(async (transaction) => {
        if ((result.observations ?? []).length > 0) {
          await transaction.agentObservation.createMany({
            data: (result.observations ?? []).map((observation) => ({
              agentRunId: run.id,
              observationType: observation.observationType,
              summary: observation.summary,
              metadata:
                (observation.metadata as Prisma.InputJsonValue | undefined) ??
                Prisma.JsonNull,
            })),
          });
        }

        if ((result.decisions ?? []).length > 0) {
          await transaction.agentDecision.createMany({
            data: (result.decisions ?? []).map((decision) => ({
              agentRunId: run.id,
              decisionType: decision.decisionType,
              summary: decision.summary,
              rationale: decision.rationale ?? null,
              confidence: decision.confidence,
              metadata:
                (decision.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
            })),
          });
        }

        if (proposals.length > 0) {
          await transaction.agentActionProposal.createMany({
            data: proposals.map((proposal) => ({
              agentRunId: run.id,
              actionType: proposal.actionType,
              targetEntityType: proposal.targetEntityType ?? null,
              targetEntityId: proposal.targetEntityId ?? null,
              status: proposal.status,
              summary: proposal.summary,
              payload:
                (proposal.payload as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
              riskLevel: proposal.riskLevel,
              requiresApproval: proposal.requiresApproval,
            })),
          });
        }

        await transaction.agentRun.update({
          where: { id: run.id },
          data: {
            completedAt: new Date(),
            status: AgentRunStatus.SUCCEEDED,
            summary: result.summary ?? `Agent run completed for ${definition.name}.`,
          },
        });
      });

      await this.auditService.record({
        action: 'agent.run.execute',
        actorUserId: triggeredByUserId,
        entityId: run.id,
        entityType: 'agent-run',
        organizationId,
        summary: `${definition.name} completed successfully.`,
        metadata: {
          agentCode: definition.code,
          proposalCount: proposals.length,
          triggerSource,
        } as Prisma.InputJsonValue,
      });

      await this.aiObservabilityService.recordRunCompleted({
        organizationId,
        agentRunId: run.id,
        finalStatus: AgentRunStatus.SUCCEEDED,
        proposalCount: proposals.length,
        confidence: confidenceMetric,
      });

      await this.usageMeterService.recordUsage({
        organizationId,
        metricType: 'AGENT_RUNS',
        metricValue: 1,
        metadata: {
          agentCode: definition.code,
          agentRunId: run.id,
          triggerSource,
        },
      });

      await this.reportGeneratorService.generateForAgentRun(run.id);

      await this.domainEventsService.publish({
        organizationId,
        eventType: 'agent.run.completed',
        aggregateType: 'agent-run',
        aggregateId: run.id,
        triggeredByUserId: triggeredByUserId,
        payload: {
          notification: {
            category: NotificationCategory.SYSTEM,
            severity: NotificationSeverity.INFO,
            title: `${definition.name} completed`,
            message: result.summary ?? 'Agent run completed successfully.',
            actionUrl: `/agents/runs/${run.id}`,
            entityType: 'agent-run',
            entityId: run.id,
          },
          recipients:
            triggeredByUserId
              ? { userIds: [triggeredByUserId] }
              : { permissionCodes: ['intelligence.read'] },
        },
      });

      const approvalRequiredCount = proposals.filter(
        (proposal) => proposal.status === AgentActionProposalStatus.APPROVAL_REQUIRED,
      ).length;

      if (approvalRequiredCount > 0) {
        await this.domainEventsService.publish({
          organizationId,
          eventType: 'agent.proposal.approval_required',
          aggregateType: 'agent-run',
          aggregateId: run.id,
          triggeredByUserId: triggeredByUserId,
          payload: {
            notification: {
              category: NotificationCategory.SYSTEM,
              severity: NotificationSeverity.WARNING,
              title: 'Agent proposals require approval',
              message: `${approvalRequiredCount} agent proposal(s) require review.`,
              actionUrl: `/agents/runs/${run.id}`,
              entityType: 'agent-run',
              entityId: run.id,
            },
            recipients: {
              permissionCodes: ['intelligence.review'],
            },
          },
        });
      }

      return buildSuccessResponse('Agent run created successfully.', await this.getRunView(run.id));
    } catch (error) {
      await this.prismaService.agentRun.update({
        where: { id: run.id },
        data: {
          status: AgentRunStatus.FAILED,
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown agent execution failure',
        },
      });

      await this.auditService.record({
        action: 'agent.run.fail',
        actorUserId: triggeredByUserId,
        entityId: run.id,
        entityType: 'agent-run',
        organizationId,
        summary: `${definition.name} failed.`,
        metadata: {
          agentCode: definition.code,
          reason: error instanceof Error ? error.message : 'Unknown agent execution failure',
          triggerSource,
        } as Prisma.InputJsonValue,
      });

      await this.aiObservabilityService.recordRunCompleted({
        organizationId,
        agentRunId: run.id,
        finalStatus: AgentRunStatus.FAILED,
      });

      await this.domainEventsService.publish({
        organizationId,
        eventType: 'agent.run.failed',
        aggregateType: 'agent-run',
        aggregateId: run.id,
        triggeredByUserId: triggeredByUserId,
        payload: {
          notification: {
            category: NotificationCategory.SYSTEM,
            severity: NotificationSeverity.CRITICAL,
            title: `${definition.name} failed`,
            message: error instanceof Error ? error.message : 'Agent execution failed.',
            actionUrl: `/agents/runs/${run.id}`,
            entityType: 'agent-run',
            entityId: run.id,
          },
          recipients: triggeredByUserId
            ? {
                userIds: [triggeredByUserId],
                permissionCodes: ['intelligence.manage'],
              }
            : {
                permissionCodes: ['intelligence.manage'],
              },
        },
      });

      await this.alertingService.raiseAlert({
        organizationId,
        sourceModule: 'agents',
        alertType: 'agent.run.failure',
        severity: 'CRITICAL',
        title: `${definition.name} failed`,
        summary: error instanceof Error ? error.message : 'Agent execution failed.',
        correlationId: requestId,
        metadata: {
          agentRunId: run.id,
          agentCode: definition.code,
          triggerSource,
        },
      });

      await this.incidentMonitorService.createReliabilityIncident({
        organizationId,
        sourceModule: 'agents',
        incidentType: 'AGENT_RUNTIME_FAILURE',
        title: `${definition.name} execution failure`,
        description: error instanceof Error ? error.message : 'Agent execution failed.',
        severity: 'HIGH',
        relatedEntityType: 'agent-run',
        relatedEntityId: run.id,
        metadata: {
          agentCode: definition.code,
          triggerSource,
        },
      });

      throw error;
    }
  }

  async reviewActionProposal(
    principal: CurrentPrincipal,
    proposalId: string,
    dto: ReviewAgentActionProposalDto,
  ) {
    const proposal = await this.prismaService.agentActionProposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        agentRunId: true,
        status: true,
        agentRun: {
          select: {
            id: true,
            organizationId: true,
            agentDefinition: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        payload: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Agent action proposal not found.');
    }

    if (
      proposal.agentRun.organizationId &&
      proposal.agentRun.organizationId !== principal.organizationId
    ) {
      throw new NotFoundException('Agent action proposal not found.');
    }

    const updatedPayload = {
      ...(proposal.payload && typeof proposal.payload === 'object' ? proposal.payload : {}),
      review: {
        reviewedAt: new Date().toISOString(),
        reviewerComment: dto.reviewerComment ?? null,
        reviewerUserId: principal.userId,
      },
    };

    const updatedProposal = await this.prismaService.agentActionProposal.update({
      where: { id: proposalId },
      data: {
        status: dto.status,
        payload: updatedPayload as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        actionType: true,
        status: true,
        summary: true,
        riskLevel: true,
        requiresApproval: true,
        payload: true,
        updatedAt: true,
      },
    });

    await this.auditService.record({
      action: 'agent.proposal.review',
      actorUserId: principal.userId,
      entityId: proposalId,
      entityType: 'agent-action-proposal',
      organizationId: proposal.agentRun.organizationId,
      summary: `${proposal.agentRun.agentDefinition.name} proposal reviewed.`,
      metadata: {
        reviewStatus: dto.status,
        reviewerComment: dto.reviewerComment ?? null,
      } as Prisma.InputJsonValue,
    });

    if (
      dto.status === AgentActionProposalStatus.APPROVED &&
      proposal.agentRun.organizationId
    ) {
      await this.feedbackCaptureService.capture({
        organizationId: proposal.agentRun.organizationId,
        agentRunId: proposal.agentRunId,
        sourceType: 'HUMAN',
        feedbackType: 'USEFUL',
        comment: dto.reviewerComment ?? `Proposal ${proposalId} sent for execution review.`,
        createdByUserId: principal.userId,
      });
      await this.agentExecutionService.executeApprovedProposal(proposalId, principal.userId);
    } else if (
      dto.status === AgentActionProposalStatus.REJECTED &&
      proposal.agentRun.organizationId
    ) {
      await this.feedbackCaptureService.capture({
        organizationId: proposal.agentRun.organizationId,
        agentRunId: proposal.agentRunId,
        sourceType: 'HUMAN',
        feedbackType: 'NOT_USEFUL',
        comment: dto.reviewerComment ?? `Proposal ${proposalId} dismissed during review.`,
        createdByUserId: principal.userId,
      });
    }

    return buildSuccessResponse(
      'Agent action proposal reviewed successfully.',
      updatedProposal,
    );
  }

  private async executeAgent(
    definition: { id: string; code: string; name: string; category: string },
    principal: CurrentPrincipal,
    agentRunId: string,
    context: {
      organizationId: string;
      entityType?: string;
      entityId?: string;
      payload: Record<string, unknown>;
    },
    inputContext?: Record<string, unknown>,
  ): Promise<AgentReasoningResult> {
    if (
      context.entityId &&
      context.payload.retrievalBundle !== undefined
    ) {
      return this.reasoningService.run({
        agentDefinition: definition,
        agentRunId,
        organizationId: context.organizationId,
        entityType: context.entityType ?? null,
        entityId: context.entityId ?? null,
        inputContext: inputContext ?? null,
      });
    }

    if (
      context.entityType &&
      UNIVERSAL_RETRIEVAL_ENTITY_TYPES.includes(
        context.entityType as (typeof UNIVERSAL_RETRIEVAL_ENTITY_TYPES)[number],
      )
    ) {
      return this.reasoningService.run({
        agentDefinition: definition,
        agentRunId,
        organizationId: context.organizationId,
        entityType: context.entityType,
        entityId: context.entityId ?? null,
        inputContext: inputContext ?? null,
      });
    }

    switch (definition.code) {
      case 'commerce_health_agent':
        return this.executeCommerceHealthAgent(context);
      case 'revenue_monitor_agent':
        return this.executeRevenueMonitorAgent(context);
      case 'customer_momentum_agent':
        return this.executeCustomerMomentumAgent(context);
      case 'integration_guard_agent':
        return this.executeIntegrationGuardAgent(context);
      case 'workforce-readiness-agent':
        return this.executeWorkforceReadinessAgent(principal, context);
      case 'operations-control-agent':
        return this.executeOperationsControlAgent(principal, context);
      case 'revenue-operations-agent':
        return this.executeRevenueOperationsAgent(principal, context);
      case 'operations-summary-agent':
        return this.executeOperationsSummaryAgent(principal, context);
      case 'approval-assistant-agent':
        return this.executeApprovalAssistantAgent(principal, context);
      case 'dispatch-risk-agent':
        return this.executeDispatchRiskAgent(principal, context);
      case 'driver-oversight-agent':
        return this.executeDriverOversightAgent(principal, context);
      case 'fleet-compliance-agent':
        return this.executeFleetComplianceAgent(principal, context);
      case 'commerce-monitor-agent':
        return this.executeCommerceMonitorAgent(context);
      case 'revenue-risk-agent':
        return this.executeRevenueRiskAgent(context);
      case 'customer-health-agent':
        return this.executeCustomerHealthAgent(context);
      default:
        return this.reasoningService.run({
          agentDefinition: definition,
          agentRunId,
          organizationId: context.organizationId,
          entityType: context.entityType ?? null,
          entityId: context.entityId ?? null,
          inputContext: inputContext ?? null,
        });
    }
  }

  private async executeOperationsSummaryAgent(
    principal: CurrentPrincipal,
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const result = await this.intelligenceService.generateOperationalSummary(principal, {
      organizationId: context.organizationId,
      days: 7,
      focus: 'command-center operational risk posture',
    });

    const summary = result.data.summary;
    const recommendedActions = result.data.recommendedActions.slice(0, 5);

    return {
      summary,
      observations: [
        {
          observationType: AgentObservationType.METRIC_ANALYZED,
          summary: `${context.payload.openIncidents ?? 0} open incidents and ${context.payload.pendingApprovals ?? 0} pending approvals were analyzed.`,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.SUMMARY,
          summary: result.data.headline,
          rationale:
            recommendedActions[0] ??
            'The operations summary is grounded in current incidents, approvals, and workflow posture.',
          confidence: result.data.confidence as AgentConfidenceLevel,
          metadata: result.data as unknown as Prisma.InputJsonValue,
        },
      ],
      proposals: recommendedActions.map((action) => ({
        actionType: 'CREATE_RECOMMENDATION',
        summary: action,
        targetEntityType: null,
        targetEntityId: null,
        payload: {
          source: 'operations-summary-agent',
          organizationId: context.organizationId,
        } as Prisma.InputJsonValue,
      })),
    };
  }

  private async executeWorkforceReadinessAgent(
    principal: CurrentPrincipal,
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const result = await this.intelligenceService.generateOperationalAgentInsight({
      actorUserId: principal.userId,
      organizationId: context.organizationId,
      templateKey: 'agent-workforce-readiness.v1',
      context: context.payload,
    });

    return this.buildOperationalAgentReasoningResult({
      summary: result.summary,
      insightType: AgentDecisionType.RECOMMENDATION,
      confidence: result.confidence,
      findings: result.findings,
      risks: result.risks,
      recommendations: result.recommendations,
      proposedActions: result.proposedActions,
      targetEntityType: 'organization',
      targetEntityId: context.organizationId,
      agentSource: 'workforce-readiness-agent',
    });
  }

  private async executeOperationsControlAgent(
    principal: CurrentPrincipal,
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const result = await this.intelligenceService.generateOperationalAgentInsight({
      actorUserId: principal.userId,
      organizationId: context.organizationId,
      templateKey: 'agent-operations-control.v1',
      context: context.payload,
    });

    return this.buildOperationalAgentReasoningResult({
      summary: result.summary,
      insightType: AgentDecisionType.RISK_ASSESSMENT,
      confidence: result.confidence,
      findings: result.findings,
      risks: result.risks,
      recommendations: result.recommendations,
      proposedActions: result.proposedActions,
      targetEntityType: 'organization',
      targetEntityId: context.organizationId,
      agentSource: 'operations-control-agent',
    });
  }

  private async executeRevenueOperationsAgent(
    principal: CurrentPrincipal,
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const result = await this.intelligenceService.generateOperationalAgentInsight({
      actorUserId: principal.userId,
      organizationId: context.organizationId,
      templateKey: 'agent-revenue-operations.v1',
      context: context.payload,
    });

    return this.buildOperationalAgentReasoningResult({
      summary: result.summary,
      insightType: AgentDecisionType.RECOMMENDATION,
      confidence: result.confidence,
      findings: result.findings,
      risks: result.risks,
      recommendations: result.recommendations,
      proposedActions: result.proposedActions,
      targetEntityType: 'organization',
      targetEntityId: context.organizationId,
      agentSource: 'revenue-operations-agent',
    });
  }

  private async executeApprovalAssistantAgent(
    principal: CurrentPrincipal,
    context: { entityId?: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const isApprovalStep = 'approvalRequest' in context.payload;
    const result = await this.intelligenceService.generateApprovalExplanation(principal, {
      approvalRequestId: isApprovalStep
        ? undefined
        : (context.entityId as string | undefined),
      approvalStepId: isApprovalStep ? (context.entityId as string | undefined) : undefined,
    });

    return {
      summary: result.data.summary,
      observations: [
        {
          observationType: AgentObservationType.ENTITY_EVALUATED,
          summary: `Approval context reviewed for ${result.data.title}.`,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.RECOMMENDATION,
          summary: `${result.data.title}: suggested decision is ${result.data.suggestedDecision}.`,
          rationale: result.data.rationale.join(' '),
          confidence: result.data.confidence as AgentConfidenceLevel,
          metadata: result.data as unknown as Prisma.InputJsonValue,
        },
      ],
      proposals: [
        {
          actionType: 'ESCALATE_APPROVAL_REQUEST',
          summary: `Review approval context with suggested decision ${result.data.suggestedDecision}.`,
          targetEntityType: isApprovalStep ? 'approval-step' : 'approval-request',
          targetEntityId: context.entityId ?? null,
          payload: {
            rationale: result.data.rationale,
            risks: result.data.risks,
            suggestedDecision: result.data.suggestedDecision,
          } as Prisma.InputJsonValue,
        },
      ],
    };
  }

  private async executeDispatchRiskAgent(
    principal: CurrentPrincipal,
    context: { entityId?: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    if (context.entityId) {
      const result = await this.intelligenceService.generateDispatchIncidentSummary(principal, {
        incidentId: context.entityId,
      });

      return {
        summary: result.data.summary,
        observations: [
          {
            observationType: AgentObservationType.ENTITY_EVALUATED,
            summary: `Dispatch incident ${context.entityId} evaluated for risk posture.`,
            metadata: context.payload as Prisma.InputJsonValue,
          },
        ],
        decisions: [
          {
            decisionType: AgentDecisionType.RISK_ASSESSMENT,
            summary: result.data.severityAssessment,
            rationale:
              result.data.immediateActions[0] ??
              'The incident severity assessment is based on the current dispatch incident context.',
            confidence: result.data.confidence as AgentConfidenceLevel,
            metadata: result.data as unknown as Prisma.InputJsonValue,
          },
        ],
        proposals: [
          {
            actionType: 'ESCALATE_DISPATCH_INCIDENT',
            summary: result.data.escalationRecommendation,
            targetEntityType: 'dispatch-incident',
            targetEntityId: context.entityId,
            payload: {
              immediateActions: result.data.immediateActions,
            } as Prisma.InputJsonValue,
          },
        ],
      };
    }

    const criticalIncidents = Number(context.payload.criticalIncidents ?? 0);
    const openIncidents = Number(context.payload.openIncidents ?? 0);
    const activeAssignments = Number(context.payload.activeAssignments ?? 0);

    return {
      summary: `Operations risk posture reflects ${criticalIncidents} critical incidents across ${activeAssignments} active assignments.`,
      observations: [
        {
          observationType: AgentObservationType.METRIC_ANALYZED,
          summary: `${openIncidents} open incidents and ${activeAssignments} active assignments were analyzed.`,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.RISK_ASSESSMENT,
          summary:
            criticalIncidents > 0
              ? 'Critical operations pressure requires escalation review.'
              : 'Operations posture is stable but should be monitored.',
          rationale:
            criticalIncidents > 0
              ? `${criticalIncidents} critical incidents remain open across ${activeAssignments} active assignments.`
              : `${openIncidents} open incidents are being monitored across ${activeAssignments} active assignments.`,
          confidence:
            criticalIncidents > 0 ? AgentConfidenceLevel.HIGH : AgentConfidenceLevel.MEDIUM,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      proposals:
        criticalIncidents > 0
          ? [
              {
                actionType: 'ESCALATE_DISPATCH_INCIDENT',
                summary: 'Escalate critical operational incidents to the operations supervisor queue.',
                payload: {
                  criticalIncidents,
                  openIncidents,
                } as Prisma.InputJsonValue,
              },
            ]
          : [],
    };
  }

  private async executeDriverOversightAgent(
    principal: CurrentPrincipal,
    context: { entityId?: string },
  ): Promise<AgentReasoningResult> {
    const result = await this.intelligenceService.generateDriverComplianceExplanation(principal, {
      driverId: context.entityId as string,
    });

    return {
      summary: result.data.summary,
      observations: [
        {
          observationType: AgentObservationType.ENTITY_EVALUATED,
          summary: `Operator ${context.entityId} compliance posture was evaluated.`,
          metadata: {
            blockers: result.data.blockers,
          } as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.RECOMMENDATION,
          summary: result.data.summary,
          rationale:
            result.data.blockers[0] ??
            'The operator compliance recommendation is based on current compliance findings.',
          confidence: result.data.confidence as AgentConfidenceLevel,
          metadata: result.data as unknown as Prisma.InputJsonValue,
        },
      ],
      proposals: result.data.recommendedActions.map((action) => ({
        actionType: result.data.blockers.length > 0 ? 'DRIVER_COMPLIANCE_REVIEW' : 'CREATE_RECOMMENDATION',
        summary: action,
        targetEntityType: 'driver',
        targetEntityId: context.entityId ?? null,
        payload: {
          blockers: result.data.blockers,
          findings: result.data.complianceFindings,
        } as Prisma.InputJsonValue,
      })),
    };
  }

  private async executeFleetComplianceAgent(
    principal: CurrentPrincipal,
    context: { entityId?: string },
  ): Promise<AgentReasoningResult> {
    const result = await this.intelligenceService.generateFleetReadinessExplanation(principal, {
      vehicleId: context.entityId as string,
    });

    return {
      summary: result.data.summary,
      observations: [
        {
          observationType: AgentObservationType.ENTITY_EVALUATED,
          summary: `Asset ${context.entityId} readiness posture was evaluated.`,
          metadata: {
            blockers: result.data.blockers,
          } as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.RECOMMENDATION,
          summary: result.data.summary,
          rationale:
            result.data.blockers[0] ??
            'The asset readiness recommendation is based on current readiness findings.',
          confidence: result.data.confidence as AgentConfidenceLevel,
          metadata: result.data as unknown as Prisma.InputJsonValue,
        },
      ],
      proposals: result.data.recommendedActions.map((action) => ({
        actionType: result.data.blockers.length > 0 ? 'FLEET_COMPLIANCE_REVIEW' : 'CREATE_RECOMMENDATION',
        summary: action,
        targetEntityType: 'fleet-vehicle',
        targetEntityId: context.entityId ?? null,
        payload: {
          blockers: result.data.blockers,
          findings: result.data.readinessFindings,
        } as Prisma.InputJsonValue,
      })),
    };
  }

  private async getRunView(id: string) {
    return this.prismaService.agentRun.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        status: true,
        triggerType: true,
        triggerSource: true,
        startedAt: true,
        completedAt: true,
        failedAt: true,
        summary: true,
        errorMessage: true,
        entityType: true,
        entityId: true,
        requestId: true,
        agentDefinition: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            version: true,
          },
        },
      },
    });
  }

  private buildOperationalAgentReasoningResult(input: {
    summary: string;
    insightType: AgentDecisionType;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    findings: string[];
    risks: string[];
    recommendations: string[];
    proposedActions: Array<{
      type: string;
      description: string;
      target: string;
      requiresApproval: boolean;
      rationale?: string;
    }>;
    targetEntityType: string;
    targetEntityId: string;
    agentSource: string;
  }): AgentReasoningResult {
    const mappedProposals = input.proposedActions
      .slice(0, 4)
      .map((action, index) => this.mapOperationalAgentProposal(action, index, input));

    return {
      summary: input.summary,
      observations: [
        ...input.findings.slice(0, 4).map((finding) => ({
          observationType: AgentObservationType.METRIC_ANALYZED,
          summary: finding,
          metadata: {
            agentSource: input.agentSource,
          } as Prisma.InputJsonValue,
        })),
      ],
      decisions: [
        {
          decisionType: input.insightType,
          summary: input.summary,
          rationale: input.risks[0] ?? input.recommendations[0] ?? null,
          confidence: input.confidence as AgentConfidenceLevel,
          metadata: {
            findings: input.findings,
            risks: input.risks,
            recommendations: input.recommendations,
            proposedActions: input.proposedActions,
          } as Prisma.InputJsonValue,
        },
      ],
      proposals: mappedProposals,
    };
  }

  private async executeCommerceMonitorAgent(
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const shopDomain =
      typeof context.payload.shopDomain === 'string' ? context.payload.shopDomain : 'connected shop';
    const productsCount = Number(context.payload.productsCount ?? 0);
    const protectedCustomerDataRequired = Boolean(
      context.payload.protectedCustomerDataRequired,
    );
    const stripeConnected = Boolean(context.payload.stripeConnected);
    const shopifyCoverage =
      typeof context.payload.shopifyCoverage === 'string'
        ? context.payload.shopifyCoverage
        : 'UNKNOWN';

    const decisionSummary = protectedCustomerDataRequired
      ? 'Commerce visibility is limited.'
      : stripeConnected
        ? 'Commerce telemetry is connected.'
        : 'Commerce telemetry is partially connected.';
    const rationale = protectedCustomerDataRequired
      ? `Products are visible for ${shopDomain}, but order and customer access is still restricted by Shopify.`
      : stripeConnected
        ? `${productsCount} products are visible and payment telemetry is connected.`
        : `${productsCount} products are visible, but payment telemetry is not connected yet.`;

    const proposals: ProposedAgentActionInput[] = [];

    if (protectedCustomerDataRequired) {
      proposals.push(
        this.buildCommerceProposal({
          actionType: 'CREATE_WORKFLOW_TASK',
          summary: 'Review Shopify protected data approval',
          organizationId: context.organizationId,
          rationale:
            'Order and customer coverage is restricted until Shopify protected customer data access is approved.',
          payload: {
            workflowDefinitionCode: 'agent-follow-up',
            taskKey: 'shopify-protected-data-review',
            taskTitle: 'Unlock Shopify protected data access',
            taskDescription:
              'Request or verify Shopify protected customer data approval so Nexora can observe orders and customers.',
            assigneeRoleCode: 'platform.admin',
          },
        }),
      );
    }

    if (!stripeConnected) {
      proposals.push(
        this.buildCommerceProposal({
          actionType: ActionTypes.CONNECT_STRIPE,
          summary: 'Connect Stripe for payment visibility',
          organizationId: context.organizationId,
          rationale:
            'Stripe is not connected, so refunds and payment outcomes cannot be verified.',
        }),
      );
    }

    return {
      summary: decisionSummary,
      observations: [
        {
          observationType: AgentObservationType.METRIC_ANALYZED,
          summary: `${productsCount} products are visible with ${shopifyCoverage.toLowerCase()} commerce coverage.`,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.RISK_ASSESSMENT,
          summary: decisionSummary,
          rationale,
          confidence: protectedCustomerDataRequired
            ? AgentConfidenceLevel.HIGH
            : AgentConfidenceLevel.MEDIUM,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      proposals,
    };
  }

  private async executeRevenueRiskAgent(
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const hasOrderAccess = !Boolean(context.payload.protectedCustomerDataRequired);
    const stripeConnected = Boolean(context.payload.stripeConnected);
    const totalOrdersToday =
      typeof context.payload.totalOrdersToday === 'number'
        ? context.payload.totalOrdersToday
        : Number(context.payload.totalOrdersToday ?? 0);
    const totalRevenueToday =
      typeof context.payload.totalRevenueToday === 'number'
        ? context.payload.totalRevenueToday
        : Number(context.payload.totalRevenueToday ?? 0);
    const stripeRefundsCurrent24h = Number(context.payload.stripeRefundsCurrent24h ?? 0);
    const stripeFailedPaymentsCurrent24h = Number(
      context.payload.stripeFailedPaymentsCurrent24h ?? 0,
    );

    let decisionSummary = 'Revenue visibility is incomplete.';
    let rationale =
      'Orders are restricted and payment telemetry is not fully connected, so revenue cannot be verified end to end.';
    const proposals: ProposedAgentActionInput[] = [];

    if (!hasOrderAccess) {
      proposals.push(
        this.buildCommerceProposal({
          actionType: 'CREATE_WORKFLOW_TASK',
          summary: 'Unlock Shopify order access',
          organizationId: context.organizationId,
          rationale:
            'Revenue intelligence depends on Shopify order access, which is currently restricted.',
          payload: {
            workflowDefinitionCode: 'agent-follow-up',
            taskKey: 'shopify-order-access-review',
            taskTitle: 'Unlock Shopify order access',
            taskDescription:
              'Request or verify Shopify protected customer data approval to restore order visibility.',
            assigneeRoleCode: 'platform.admin',
          },
        }),
      );
    }

    if (!stripeConnected) {
      proposals.push(
        this.buildCommerceProposal({
          actionType: ActionTypes.CONNECT_STRIPE,
          summary: 'Connect Stripe',
          organizationId: context.organizationId,
          rationale:
            'Stripe is required to verify refunds, failed payments, and confirmed revenue.',
        }),
      );
    }

    if (hasOrderAccess && totalOrdersToday === 0) {
      decisionSummary = 'No orders detected today.';
      rationale = 'Order access is available and today currently shows zero verified Shopify orders.';
      proposals.push(
        this.buildCommerceProposal({
          actionType: ActionTypes.RUN_SHOPIFY_SYNC,
          summary: 'Run Shopify sync',
          organizationId: context.organizationId,
          rationale: 'Refresh Shopify demand data before escalating a no-orders condition.',
        }),
      );
    } else if (hasOrderAccess && stripeConnected) {
      decisionSummary =
        stripeFailedPaymentsCurrent24h > 0 || stripeRefundsCurrent24h > 0
          ? 'Revenue posture requires monitoring.'
          : 'Revenue posture is observable.';
      rationale =
        stripeFailedPaymentsCurrent24h > 0 || stripeRefundsCurrent24h > 0
          ? `${stripeFailedPaymentsCurrent24h} failed payments and ${stripeRefundsCurrent24h} refunds were detected in the last 24 hours.`
          : `${totalOrdersToday} orders and ${this.formatCurrency(totalRevenueToday)} in revenue are currently observable.`;
    }

    return {
      summary: decisionSummary,
      observations: [
        {
          observationType: AgentObservationType.METRIC_ANALYZED,
          summary: hasOrderAccess
            ? `${totalOrdersToday} verified orders and ${this.formatCurrency(totalRevenueToday)} revenue were reviewed.`
            : 'Revenue metrics were reviewed with limited Shopify coverage.',
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.RISK_ASSESSMENT,
          summary: decisionSummary,
          rationale,
          confidence: hasOrderAccess ? AgentConfidenceLevel.MEDIUM : AgentConfidenceLevel.HIGH,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      proposals,
    };
  }

  private async executeCustomerHealthAgent(
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    const customerCoverageAvailable = Boolean(context.payload.customerCoverageAvailable);
    const highValueCustomers = Number(context.payload.highValueCustomers ?? 0);
    const atRiskCustomers = Number(context.payload.atRiskCustomers ?? 0);
    const dormantCustomers = Number(context.payload.dormantCustomers ?? 0);
    const totalProfiles = Number(context.payload.totalProfiles ?? 0);

    const decisionSummary = customerCoverageAvailable
      ? atRiskCustomers > 0 || dormantCustomers > 0
        ? 'Customer health requires follow-up.'
        : 'Customer health is observable.'
      : 'Customer health coverage is restricted.';
    const rationale = customerCoverageAvailable
      ? atRiskCustomers > 0 || dormantCustomers > 0
        ? `${atRiskCustomers} at-risk and ${dormantCustomers} dormant customers require retention review.`
        : `${totalProfiles} customer profiles are available with ${highValueCustomers} high-value accounts identified.`
      : 'Customer intelligence cannot be evaluated until Shopify customer access is approved.';

    const proposals: ProposedAgentActionInput[] = [];

    if (!customerCoverageAvailable) {
      proposals.push(
        this.buildCommerceProposal({
          actionType: 'CREATE_WORKFLOW_TASK',
          summary: 'Unlock Shopify customer access',
          organizationId: context.organizationId,
          rationale:
            'Customer health, segmentation, and retention coverage depend on Shopify customer access.',
          payload: {
            workflowDefinitionCode: 'agent-follow-up',
            taskKey: 'shopify-customer-access-review',
            taskTitle: 'Unlock Shopify customer access',
            taskDescription:
              'Request or verify Shopify protected customer data approval to restore customer intelligence.',
            assigneeRoleCode: 'platform.admin',
          },
        }),
      );
    } else if (atRiskCustomers > 0 || dormantCustomers > 0) {
      proposals.push(
        this.buildCommerceProposal({
          actionType: 'CREATE_WORKFLOW_TASK',
          summary: 'Review retention follow-up',
          organizationId: context.organizationId,
          rationale:
            'Customer health shows at-risk or dormant segments that should be reviewed by the operating team.',
          payload: {
            workflowDefinitionCode: 'agent-follow-up',
            taskKey: 'customer-health-follow-up',
            taskTitle: 'Review customer health follow-up',
            taskDescription:
              'Review at-risk and dormant customer segments and define a retention follow-up plan.',
            assigneeRoleCode: 'platform.admin',
          },
        }),
      );
    }

    return {
      summary: decisionSummary,
      observations: [
        {
          observationType: AgentObservationType.ENTITY_EVALUATED,
          summary: customerCoverageAvailable
            ? `${totalProfiles} customer profiles were evaluated.`
            : 'Customer intelligence coverage is currently restricted.',
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      decisions: [
        {
          decisionType: AgentDecisionType.RECOMMENDATION,
          summary: decisionSummary,
          rationale,
          confidence: customerCoverageAvailable
            ? AgentConfidenceLevel.MEDIUM
            : AgentConfidenceLevel.HIGH,
          metadata: context.payload as Prisma.InputJsonValue,
        },
      ],
      proposals,
    };
  }

  private executeCommerceHealthAgent(
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    return Promise.resolve(
      this.mapCommerceAgentOutputToReasoningResult(
        'commerce_health_agent',
        this.commerceHealthAgent.run(context.payload as unknown as CommerceAgentContext),
        context.organizationId,
      ),
    );
  }

  private executeRevenueMonitorAgent(
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    return Promise.resolve(
      this.mapCommerceAgentOutputToReasoningResult(
        'revenue_monitor_agent',
        this.revenueMonitorAgent.run(context.payload as unknown as CommerceAgentContext),
        context.organizationId,
      ),
    );
  }

  private executeCustomerMomentumAgent(
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    return Promise.resolve(
      this.mapCommerceAgentOutputToReasoningResult(
        'customer_momentum_agent',
        this.customerMomentumAgent.run(context.payload as unknown as CommerceAgentContext),
        context.organizationId,
      ),
    );
  }

  private executeIntegrationGuardAgent(
    context: { organizationId: string; payload: Record<string, unknown> },
  ): Promise<AgentReasoningResult> {
    return Promise.resolve(
      this.mapCommerceAgentOutputToReasoningResult(
        'integration_guard_agent',
        this.integrationGuardAgent.run(context.payload as unknown as CommerceAgentContext),
        context.organizationId,
      ),
    );
  }

  private mapCommerceAgentOutputToReasoningResult(
    agentKey: string,
    output: CommerceAgentOutput,
    organizationId: string,
  ): AgentReasoningResult {
    const confidence =
      output.confidence === 'high'
        ? AgentConfidenceLevel.HIGH
        : output.confidence === 'medium'
          ? AgentConfidenceLevel.MEDIUM
          : AgentConfidenceLevel.LOW;
    const findings = output.observations.slice(0, 4);
    const risks = output.evidence.slice(0, 4);
    const proposedActions = [
      ...output.proposals,
      ...output.suggestedExecutions.map((item) => item.summary),
    ].slice(0, 4);

    return {
      summary: output.summary,
      observations: findings.map((item) => ({
        observationType: AgentObservationType.METRIC_ANALYZED,
        summary: item,
        metadata: {
          agentKey,
          evidence: output.evidence,
        } as Prisma.InputJsonValue,
      })),
      decisions: [
        {
          decisionType: AgentDecisionType.RECOMMENDATION,
          summary: output.summary,
          rationale: output.recommendations[0] ?? output.proposals[0] ?? null,
          confidence,
          metadata: {
            findings,
            risks,
            recommendations: output.recommendations,
            proposedActions,
            evidence: output.evidence,
            suggestedExecutions: output.suggestedExecutions,
            agentKey,
          } as Prisma.InputJsonValue,
        },
      ],
      proposals: output.suggestedExecutions.map((item) =>
        this.buildCommerceProposal({
          actionType: item.actionType,
          summary: item.summary,
          organizationId,
          rationale: output.summary,
          payload: {
            source: 'commerce-agent-layer',
            safeExecution: item.safe,
            evidence: output.evidence,
          },
        }),
      ),
    };
  }

  private buildCommerceProposal(input: {
    actionType: string;
    summary: string;
    organizationId: string;
    rationale: string;
    payload?: Record<string, unknown>;
  }): ProposedAgentActionInput {
    return {
      actionType: input.actionType,
      summary: input.summary,
      targetEntityType: 'organization',
      targetEntityId: input.organizationId,
      payload: {
        rationale: input.rationale,
        source: 'commerce-agent-runtime',
        ...(input.payload ?? {}),
      } as Prisma.InputJsonValue,
    };
  }

  private formatCurrency(amount: number | null | undefined) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return '$0';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private buildSystemPrincipal(organizationId: string): CurrentPrincipal {
    return {
      userId: 'system',
      email: 'system@nexora.local',
      organizationId,
      roles: ['system'],
      permissions: [],
    };
  }

  private mapOperationalAgentProposal(
    action: {
      type: string;
      description: string;
      target: string;
      requiresApproval: boolean;
      rationale?: string;
    },
    index: number,
    input: {
      targetEntityType: string;
      targetEntityId: string;
      agentSource: string;
    },
  ): ProposedAgentActionInput {
    const normalized = action.type.toUpperCase();

    if (normalized.includes('HIRING') || normalized.includes('WORKFLOW')) {
      return {
        actionType: 'CREATE_WORKFLOW_TASK',
        summary: action.description,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        payload: {
          workflowDefinitionCode: 'agent-follow-up',
          taskKey: `agent-follow-up-${index + 1}`,
          taskTitle: action.description.slice(0, 160),
          taskDescription: action.rationale ?? action.description,
          assigneeRoleCode: 'platform.admin',
          targetSummary: action.target,
          source: input.agentSource,
          requiresApproval: action.requiresApproval,
        } as Prisma.InputJsonValue,
      };
    }

    if (normalized.includes('APPROVAL') || normalized.includes('ESCALATE')) {
      return {
        actionType: 'ESCALATE_APPROVAL_REQUEST',
        summary: action.description,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        payload: {
          title: action.description.slice(0, 160),
          description: action.rationale ?? action.description,
          stepKey: `agent-escalation-${index + 1}`,
          stepTitle: 'Review agent escalation',
          stepDescription: action.description,
          approverRoleCode: 'platform.admin',
          targetSummary: action.target,
          source: input.agentSource,
        } as Prisma.InputJsonValue,
      };
    }

    if (normalized.includes('INCIDENT')) {
      return {
        actionType: ActionTypes.ESCALATE_INCIDENT,
        summary: action.description,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        payload: {
          rationale: action.rationale ?? action.description,
          targetSummary: action.target,
          source: input.agentSource,
        } as Prisma.InputJsonValue,
      };
    }

    return {
      actionType: ActionTypes.ALERT_SUPERVISOR,
      summary: action.description,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      payload: {
        title: action.description.slice(0, 160),
        message: action.rationale ?? action.description,
        roleCodes: ['platform.admin'],
        targetSummary: action.target,
        source: input.agentSource,
      } as Prisma.InputJsonValue,
    };
  }
}
