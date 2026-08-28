import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, resolvePagination } from '../../shared/pagination/pagination.util';
import { buildPaginatedResponse, buildSuccessResponse } from '../../shared/responses/response.util';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { MarkAiNotificationDto } from './dto/mark-ai-notification.dto';
import { MarkAllAiNotificationsDto } from './dto/mark-all-ai-notifications.dto';
import { QueryAiNotificationsDto } from './dto/query-ai-notifications.dto';

type NotificationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type NotificationDraft = {
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  metadata?: Prisma.InputJsonValue;
  dedupeWindowHours?: number;
};

@Injectable()
export class AiNotificationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async listNotifications(principal: CurrentPrincipal, query: QueryAiNotificationsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.AiNotificationWhereInput = {
      organizationId,
      ...(query.unreadOnly ? { isRead: false } : {}),
      ...(query.archived === true ? { isArchived: true } : { isArchived: false }),
      ...(query.severity ? { severity: query.severity } : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.aiNotification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.aiNotification.count({ where }),
    ]);

    return buildPaginatedResponse(
      'AI notifications retrieved successfully.',
      items,
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async markAsRead(principal: CurrentPrincipal, dto: MarkAiNotificationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    await this.ensureNotification(organizationId, dto.notificationId);

    const notification = await this.prismaService.aiNotification.update({
      where: { id: dto.notificationId },
      data: {
        isRead: true,
      },
    });

    return buildSuccessResponse('AI notification marked as read successfully.', notification);
  }

  async markAllAsRead(principal: CurrentPrincipal, dto: MarkAllAiNotificationsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );

    const result = await this.prismaService.aiNotification.updateMany({
      where: {
        organizationId,
        isArchived: false,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return buildSuccessResponse('AI notifications marked as read successfully.', {
      updatedCount: result.count,
    });
  }

  async archiveNotification(principal: CurrentPrincipal, dto: MarkAiNotificationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    await this.ensureNotification(organizationId, dto.notificationId);

    const notification = await this.prismaService.aiNotification.update({
      where: { id: dto.notificationId },
      data: {
        isRead: true,
        isArchived: true,
      },
    });

    return buildSuccessResponse('AI notification archived successfully.', notification);
  }

  async generateNotificationsForOrganization(
    organizationId: string,
    input: {
      signals?: Array<{
        type: string;
        severity: string;
        title: string;
        description: string;
      }>;
      recommendations?: Array<{
        category: string;
        priority: string;
        title: string;
        description: string;
      }>;
    },
  ) {
    const drafts: NotificationDraft[] = [];

    for (const signal of input.signals ?? []) {
      const normalizedSeverity = signal.severity.toUpperCase();

      if (
        signal.type === 'revenue_drop' ||
        signal.type === 'order_slowdown' ||
        normalizedSeverity === 'HIGH' ||
        normalizedSeverity === 'CRITICAL'
      ) {
        drafts.push({
          type: `signal:${signal.type}`,
          severity: normalizedSeverity === 'CRITICAL' ? 'CRITICAL' : normalizedSeverity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          title: signal.title,
          message: signal.description,
          relatedEntityId: signal.type,
          relatedEntityType: 'signal',
          metadata: {
            source: 'ai_signal',
            signalType: signal.type,
          } as Prisma.InputJsonValue,
          dedupeWindowHours: 6,
        });
      }
    }

    for (const recommendation of input.recommendations ?? []) {
      if (recommendation.priority === 'CRITICAL') {
        drafts.push({
          type: `recommendation:${recommendation.category}`,
          severity: 'CRITICAL',
          title: recommendation.title,
          message: recommendation.description,
          relatedEntityId: recommendation.category,
          relatedEntityType: 'recommendation',
          metadata: {
            source: 'ai_recommendation',
            recommendationCategory: recommendation.category,
          } as Prisma.InputJsonValue,
          dedupeWindowHours: 8,
        });
      }
    }

    return this.createManyDeduped(organizationId, drafts);
  }

  async notifySyncCompleted(input: {
    organizationId: string;
    syncRunId: string;
    syncType: string;
    recordsProcessed: number;
    firstSuccessfulSync: boolean;
  }) {
    if (!input.firstSuccessfulSync) {
      return { createdCount: 0 };
    }

    return this.createManyDeduped(input.organizationId, [
      {
        type: 'sync:first_success',
        severity: 'LOW',
        title: 'Shopify intelligence is now live',
        message: `The first successful Shopify ${input.syncType} sync completed and ${input.recordsProcessed} records were processed.`,
        relatedEntityId: input.syncRunId,
        relatedEntityType: 'shopify_sync',
        metadata: {
          source: 'shopify_sync',
          syncType: input.syncType,
          recordsProcessed: input.recordsProcessed,
        } as Prisma.InputJsonValue,
        dedupeWindowHours: 24,
      },
    ]);
  }

  async notifySyncFailed(input: {
    organizationId: string;
    syncRunId: string;
    syncType: string;
    errorMessage: string | null;
  }) {
    return this.createManyDeduped(input.organizationId, [
      {
        type: `sync_failed:${input.syncType}`,
        severity: 'HIGH',
        title: 'Shopify sync needs attention',
        message: `The latest Shopify ${input.syncType} sync failed. ${input.errorMessage ?? 'Nexora could not complete the sync.'}`,
        relatedEntityId: input.syncRunId,
        relatedEntityType: 'shopify_sync',
        metadata: {
          source: 'shopify_sync',
          syncType: input.syncType,
          errorMessage: input.errorMessage,
        } as Prisma.InputJsonValue,
        dedupeWindowHours: 2,
      },
    ]);
  }

  async notifyProposalDecision(input: {
    organizationId: string;
    proposalId: string;
    title: string;
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | 'DEFERRED';
    note: string | null;
  }) {
    const severity =
      input.decision === 'APPROVED'
        ? 'LOW'
        : input.decision === 'NEEDS_REVISION'
          ? 'MEDIUM'
          : input.decision === 'DEFERRED'
            ? 'LOW'
          : 'HIGH';

    return this.createManyDeduped(input.organizationId, [
      {
        type: `proposal_decision:${input.decision.toLowerCase()}`,
        severity,
        title: `Proposal ${input.decision.toLowerCase().replace('_', ' ')}`,
        message:
          input.decision === 'APPROVED'
            ? `${input.title} was approved for governed follow-through.`
            : input.decision === 'REJECTED'
              ? `${input.title} was rejected during review.${input.note ? ` Note: ${input.note}` : ''}`
              : input.decision === 'DEFERRED'
                ? `${input.title} was deferred for later review.${input.note ? ` Note: ${input.note}` : ''}`
              : `${input.title} needs revision before it can move forward.${input.note ? ` Note: ${input.note}` : ''}`,
        relatedEntityId: input.proposalId,
        relatedEntityType: 'action_proposal',
        metadata: {
          source: 'action_proposal_review',
          decision: input.decision,
          note: input.note,
        } as Prisma.InputJsonValue,
        dedupeWindowHours: 2,
      },
    ]);
  }

  private async createManyDeduped(organizationId: string, drafts: NotificationDraft[]) {
    let createdCount = 0;

    for (const draft of drafts) {
      const dedupeWindowStart = new Date(
        Date.now() - (draft.dedupeWindowHours ?? 6) * 60 * 60 * 1000,
      );
      const existing = await this.prismaService.aiNotification.findFirst({
        where: {
          organizationId,
          type: draft.type,
          title: draft.title,
          relatedEntityId: draft.relatedEntityId ?? null,
          relatedEntityType: draft.relatedEntityType ?? null,
          createdAt: {
            gte: dedupeWindowStart,
          },
          isArchived: false,
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      await this.prismaService.aiNotification.create({
        data: {
          organizationId,
          type: draft.type,
          severity: draft.severity,
          title: draft.title,
          message: draft.message,
          relatedEntityId: draft.relatedEntityId ?? null,
          relatedEntityType: draft.relatedEntityType ?? null,
          metadata: draft.metadata ?? Prisma.JsonNull,
          isRead: false,
          isArchived: false,
        },
      });
      createdCount += 1;
    }

    if (createdCount > 0) {
      this.logger.debug({
        event: 'ai.notifications.generated',
        organizationId,
        createdCount,
      });
    }

    return { createdCount };
  }

  private async ensureNotification(organizationId: string, notificationId: string) {
    const notification = await this.prismaService.aiNotification.findFirst({
      where: {
        id: notificationId,
        organizationId,
      },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('AI notification not found.');
    }
  }
}
