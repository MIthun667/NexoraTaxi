import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ActionExecutionStatus, ActionApprovalStatus, ActionExecutionType, ActionOutcomeType } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { CommerceAgentOrchestrationService } from '../agents/commerce-agent-orchestration.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { ShopifySyncService } from '../integrations/shopify/shopify-sync.service';
import { StripeSyncService } from '../integrations/stripe/stripe-sync.service';
import { AiLearningService } from './ai-learning.service';
import { AiSignalService } from './ai-signal.service';
import { AiRecommendationService } from './ai-recommendation.service';

@Injectable()
export class AiExecutionService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly logger: PlatformLoggerService,
    @Inject(forwardRef(() => ShopifySyncService))
    private readonly shopifySyncService: ShopifySyncService,
    @Inject(forwardRef(() => StripeSyncService))
    private readonly stripeSyncService: StripeSyncService,
    @Inject(forwardRef(() => CommerceAgentOrchestrationService))
    private readonly commerceAgentOrchestrationService: CommerceAgentOrchestrationService,
  ) {}

  private get aiSignalService() {
    return this.moduleRef.get(AiSignalService, { strict: false });
  }

  private get aiLearningService() {
    return this.moduleRef.get(AiLearningService, { strict: false });
  }

  private get aiRecommendationService() {
    return this.moduleRef.get(AiRecommendationService, { strict: false });
  }

  async listExecutions(principal: CurrentPrincipal, query: any) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const items = await this.prismaService.actionExecution.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        proposal: true,
        requestedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        outcome: true,
      },
    });

    return buildSuccessResponse('Action executions retrieved successfully.', items);
  }

  async getExecution(principal: CurrentPrincipal, id: string) {
    const execution = await this.prismaService.actionExecution.findUnique({
      where: { id },
      include: {
        proposal: true,
        requestedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        auditTrail: {
          orderBy: { createdAt: 'desc' },
        },
        outcome: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Action execution not found');
    }

    await this.aiCommerceMetricsService.resolveOrganizationScope(principal, execution.organizationId);

    return buildSuccessResponse('Action execution retrieved successfully.', execution);
  }

  async createExecutionFromProposal(principal: CurrentPrincipal, proposalId: string) {
    const proposal = await this.prismaService.actionProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Action proposal not found');
    }

    const organizationId = proposal.organizationId;
    const type = this.mapProposalToExecutionType(proposal.proposalType);
    const riskLevel = proposal.priority; // Using priority as a proxy for risk for now

    const approvalStatus = this.determineApprovalStatus(type, riskLevel);
    const status = approvalStatus === ActionApprovalStatus.NOT_REQUIRED ? ActionExecutionStatus.PENDING : ActionExecutionStatus.PENDING_APPROVAL;

    const execution = await this.prismaService.actionExecution.create({
      data: {
        proposalId,
        organizationId,
        type,
        status,
        approvalStatus,
        requestedByUserId: principal.userId,
      },
    });

    await this.audit(execution.id, organizationId, 'CREATE', principal.userId, null, status);

    if (approvalStatus === ActionApprovalStatus.NOT_REQUIRED) {
      return this.execute(principal, execution.id);
    }

    return buildSuccessResponse('Action execution created and pending approval.', execution);
  }

  async approveAction(principal: CurrentPrincipal, id: string, note?: string) {
    const execution = await this.requireScopedExecution(principal, id);

    if (execution.approvalStatus !== ActionApprovalStatus.PENDING) {
      throw new BadRequestException('Action is not pending approval');
    }

    const updated = await this.prismaService.actionExecution.update({
      where: { id },
      data: {
        approvalStatus: ActionApprovalStatus.APPROVED,
        status: ActionExecutionStatus.APPROVED,
        approvedByUserId: principal.userId,
        metadata: {
          ...(execution.metadata as object || {}),
          approvalNote: note,
        },
      },
    });

    await this.audit(id, execution.organizationId, 'APPROVE', principal.userId, execution.status, ActionExecutionStatus.APPROVED);

    return this.execute(principal, id);
  }

  async rejectAction(principal: CurrentPrincipal, id: string, note?: string) {
    const execution = await this.requireScopedExecution(principal, id);

    const updated = await this.prismaService.actionExecution.update({
      where: { id },
      data: {
        approvalStatus: ActionApprovalStatus.REJECTED,
        status: ActionExecutionStatus.REJECTED,
        metadata: {
          ...(execution.metadata as object || {}),
          rejectionNote: note,
        },
      },
    });

    await this.audit(id, execution.organizationId, 'REJECT', principal.userId, execution.status, ActionExecutionStatus.REJECTED);

    return buildSuccessResponse('Action execution rejected.', updated);
  }

  async execute(principal: CurrentPrincipal, id: string) {
    const execution = await this.requireScopedExecution(principal, id);

    if (execution.status !== ActionExecutionStatus.APPROVED && execution.status !== ActionExecutionStatus.PENDING) {
       throw new BadRequestException(`Action cannot be executed in current state: ${execution.status}`);
    }

    // Mark as executing
    await this.prismaService.actionExecution.update({
      where: { id },
      data: { status: ActionExecutionStatus.EXECUTING },
    });
    await this.audit(id, execution.organizationId, 'START_EXECUTION', principal.userId, execution.status, ActionExecutionStatus.EXECUTING);

    try {
      const result = await this.runHandler(principal, execution.type, execution.organizationId);
      
      const completed = await this.prismaService.actionExecution.update({
        where: { id },
        data: {
          status: ActionExecutionStatus.COMPLETED,
          executedAt: new Date(),
          result: result as any,
        },
      });

      await this.audit(id, execution.organizationId, 'COMPLETE_EXECUTION', principal.userId, ActionExecutionStatus.EXECUTING, ActionExecutionStatus.COMPLETED);

      // Record positive outcome for successful execution
      await this.aiLearningService.recordOutcome(principal, id, {
        outcomeType: ActionOutcomeType.POSITIVE,
        outcomeScore: 1.0,
        notes: `Auto-recorded after successful ${execution.type} execution.`,
      });

      await this.handleExecutionFollowup(execution.organizationId, id, execution.type, ActionExecutionStatus.COMPLETED);

      return buildSuccessResponse('Action execution completed successfully.', completed);
    } catch (error) {
      const failed = await this.prismaService.actionExecution.update({
        where: { id },
        data: {
          status: ActionExecutionStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown execution error',
        },
      });

      await this.audit(id, execution.organizationId, 'FAIL_EXECUTION', principal.userId, ActionExecutionStatus.EXECUTING, ActionExecutionStatus.FAILED, { error: error instanceof Error ? error.message : 'Unknown error' });

      // Record negative outcome for failed execution
      await this.aiLearningService.recordOutcome(principal, id, {
        outcomeType: ActionOutcomeType.NEGATIVE,
        outcomeScore: -1.0,
        notes: `Auto-recorded after execution failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      await this.handleExecutionFollowup(execution.organizationId, id, execution.type, ActionExecutionStatus.FAILED);

      return buildSuccessResponse('Action execution failed.', failed);
    }
  }

  private async runHandler(principal: CurrentPrincipal, type: ActionExecutionType, organizationId: string) {
      this.logger.log({
        event: 'ai.execution.handler.start',
        type,
        organizationId,
      });

    switch (type) {
      case ActionExecutionType.RETRY_SHOPIFY_SYNC:
        return this.shopifySyncService.syncAllForOrganization(principal, { organizationId });
      
      case ActionExecutionType.RETRY_STRIPE_SYNC:
        return this.stripeSyncService.syncForOrganization(principal, { organizationId });

      case ActionExecutionType.TRIGGER_DATA_REFRESH:
        await Promise.all([
           this.aiSignalService.refreshSignals(principal, { organizationId }),
           this.aiRecommendationService.refreshRecommendations(principal, { organizationId }),
        ]);
        // Daily brief is computed on-demand, so refreshing signals/recommendations is usually enough
        return { status: 'REFRESH_TRIGGERED' };

      case ActionExecutionType.RECONNECT_STORE:
        // In a real app, this might generate a one-time link or reset a status
        return { status: 'RECONNECT_FLOW_INITIALIZED', actionRequired: 'LINK_OAUTH' };

      case ActionExecutionType.ESCALATE_ISSUE:
        return { status: 'ISSUE_ESCALATED', notifiedRoles: ['ADMIN', 'EXECUTIVE'] };

      case ActionExecutionType.MARK_RESOLVED:
        return { status: 'ISSUE_MARKED_RESOLVED' };

      default:
        throw new BadRequestException(`No handler implemented for action type: ${type}`);
    }
  }

  private mapProposalToExecutionType(proposalType: string): ActionExecutionType {
    // Basic mapping logic
    const normalized = proposalType.toUpperCase();
    if (normalized.includes('SHOPIFY') && normalized.includes('SYNC')) return ActionExecutionType.RETRY_SHOPIFY_SYNC;
    if (normalized.includes('STRIPE') && normalized.includes('SYNC')) return ActionExecutionType.RETRY_STRIPE_SYNC;
    if (normalized.includes('REFRESH')) return ActionExecutionType.TRIGGER_DATA_REFRESH;
    if (normalized.includes('RECONNECT')) return ActionExecutionType.RECONNECT_STORE;
    if (normalized.includes('ESCALATE')) return ActionExecutionType.ESCALATE_ISSUE;
    
    return ActionExecutionType.MARK_RESOLVED;
  }

  private determineApprovalStatus(type: ActionExecutionType, riskLevel: string): ActionApprovalStatus {
    // Low risk types auto-approve
    if (type === ActionExecutionType.RETRY_SHOPIFY_SYNC || 
        type === ActionExecutionType.RETRY_STRIPE_SYNC ||
        type === ActionExecutionType.TRIGGER_DATA_REFRESH) {
      return ActionApprovalStatus.NOT_REQUIRED;
    }

    // Medium/High risk or unknown types require approval
    return ActionApprovalStatus.PENDING;
  }

  private async audit(
    executionId: string, 
    organizationId: string, 
    action: string, 
    actorUserId: string | null, 
    previousStatus: ActionExecutionStatus | null, 
    newStatus: ActionExecutionStatus | null,
    metadata: any = {}
  ) {
    await this.prismaService.actionExecutionAudit.create({
      data: {
        executionId,
        organizationId,
        action,
        actorUserId,
        previousStatus: previousStatus as string,
        newStatus: newStatus as string,
        metadata: metadata || {},
      },
    });
  }

  private async requireScopedExecution(principal: CurrentPrincipal, id: string) {
    const execution = await this.prismaService.actionExecution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException('Action execution not found');
    }

    await this.aiCommerceMetricsService.resolveOrganizationScope(principal, execution.organizationId);

    return execution;
  }

  private async handleExecutionFollowup(
    organizationId: string,
    executionId: string,
    executionType: ActionExecutionType,
    executionStatus: ActionExecutionStatus,
  ) {
    if (
      executionType === ActionExecutionType.RETRY_SHOPIFY_SYNC &&
      executionStatus === ActionExecutionStatus.FAILED
    ) {
      await this.commerceAgentOrchestrationService.emitExecutionFollowupTrigger({
        organizationId,
        executionId,
        executionType,
        executionStatus,
        agentKey: 'integration_guard_agent',
        reason: 'A Shopify sync retry failed and integration health should be reviewed.',
      });
      return;
    }

    if (
      executionType === ActionExecutionType.RETRY_STRIPE_SYNC &&
      executionStatus === ActionExecutionStatus.FAILED
    ) {
      await this.commerceAgentOrchestrationService.emitExecutionFollowupTrigger({
        organizationId,
        executionId,
        executionType,
        executionStatus,
        agentKey: 'integration_guard_agent',
        reason: 'A payments sync retry failed and payments visibility should be reviewed.',
      });
      return;
    }

    if (
      executionType === ActionExecutionType.TRIGGER_DATA_REFRESH &&
      executionStatus === ActionExecutionStatus.COMPLETED
    ) {
      await this.commerceAgentOrchestrationService.emitExecutionFollowupTrigger({
        organizationId,
        executionId,
        executionType,
        executionStatus,
        agentKey: 'commerce_health_agent',
        reason: 'A successful data refresh completed and store health should be resummarized.',
      });
    }
  }
}
