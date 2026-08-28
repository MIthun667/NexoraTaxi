import {
  AgentTriggerEventSource,
  AgentTriggerEventStatus,
  AgentTriggerEventType,
  AgentTriggerType,
  Prisma,
} from '@prisma/client';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import { AiCommerceMetricsService } from '../intelligence/ai-commerce-metrics.service';
import { AiOnboardingStep } from '@prisma/client';
import { AiSignalService, CanonicalAiSignal } from '../intelligence/ai-signal.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { COMMERCE_AGENT_KEYS, CommerceAgentKey } from './commerce-agent.constants';
import { QueryAgentTriggersDto } from './dto/query-agent-triggers.dto';
import { OrchestrateCommerceAgentsDto } from './dto/orchestrate-commerce-agents.dto';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';

type TriggerEventInput = {
  organizationId: string;
  agentKey: CommerceAgentKey;
  triggerType: AgentTriggerEventType;
  source: AgentTriggerEventSource;
  sourceId?: string | null;
  reason: string;
  dedupeKey: string;
  metadata?: Prisma.InputJsonValue;
};

const SIGNAL_TRIGGER_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const EXECUTION_FOLLOWUP_COOLDOWN_MS = 45 * 60 * 1000;
const MANUAL_TRIGGER_COOLDOWN_MS = 2 * 60 * 1000;
const SCHEDULE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const DAILY_SCHEDULE_HOUR_UTC = 1;

@Injectable()
export class CommerceAgentOrchestrationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CommerceAgentOrchestrationService.name);
  private intervalRef: NodeJS.Timeout | null = null;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly agentRuntimeService: AgentRuntimeService,
    @Inject(forwardRef(() => AiSignalService))
    private readonly aiSignalService: AiSignalService,
  ) {}

  onModuleInit() {
    if (!this.prismaService.isDatabaseAvailable()) {
      return;
    }

    this.intervalRef = setInterval(() => {
      void this.runScheduledPass().catch((error: unknown) => {
        this.logger.error(
          `Scheduled agent orchestration failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      });
    }, SCHEDULE_CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  async listTriggers(principal: CurrentPrincipal, query: QueryAgentTriggersDto) {
    const { page, limit, skip } = resolvePagination(query);
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const where: Prisma.AgentTriggerEventWhereInput = {
      organizationId,
      ...(query.agentKey ? { agentKey: query.agentKey } : {}),
      ...(query.status
        ? { status: this.toTriggerStatusEnum(query.status) }
        : {}),
      ...(query.triggerType
        ? { triggerType: this.toTriggerTypeEnum(query.triggerType) }
        : {}),
    };

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.agentTriggerEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          agentRun: {
            select: {
              id: true,
              status: true,
              summary: true,
            },
          },
        },
      }),
      this.prismaService.agentTriggerEvent.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Agent triggers retrieved successfully.',
      items.map((item: (typeof items)[number]) => this.toTriggerView(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getTrigger(principal: CurrentPrincipal, id: string) {
    const item = await this.prismaService.agentTriggerEvent.findUnique({
      where: { id },
      include: {
        agentRun: {
          select: {
            id: true,
            status: true,
            summary: true,
            triggerType: true,
            triggerSource: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!item) {
      throw new Error('Agent trigger not found.');
    }

    await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      item.organizationId,
    );

    return buildSuccessResponse(
      'Agent trigger retrieved successfully.',
      this.toTriggerView(item),
    );
  }

  async orchestrate(principal: CurrentPrincipal, dto: OrchestrateCommerceAgentsDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );

    const [signals] = await Promise.all([
      this.aiSignalService.getCanonicalSignals(
        principal,
        { organizationId },
        { forceRefresh: true },
      ),
    ]);

    const triggerResults = await Promise.all([
      this.emitSignalTriggers(principal, organizationId, signals),
      this.emitScheduledTriggersForOrganization(organizationId),
    ]);

    return buildSuccessResponse('Agent orchestration pass completed successfully.', {
      organizationId,
      processedTriggers: triggerResults.flat(),
    });
  }

  async runManualAgent(
    principal: CurrentPrincipal,
    key: CommerceAgentKey,
    dto: CreateAgentRunDto,
  ) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );

    return this.processTrigger({
      organizationId,
      agentKey: key,
      triggerType: AgentTriggerEventType.MANUAL,
      source: AgentTriggerEventSource.OPERATOR,
      sourceId: principal.userId,
      reason: `Operator manually started ${key.replaceAll('_', ' ')}.`,
      dedupeKey: `${organizationId}:${key}:manual:${Date.now()}`,
      metadata: {
        invokedByUserId: principal.userId,
      } as Prisma.InputJsonValue,
    }, {
      principal,
      createRunDto: {
        ...dto,
        organizationId,
        agentCode: key,
        triggerType: AgentTriggerType.MANUAL,
      },
      cooldownMs: MANUAL_TRIGGER_COOLDOWN_MS,
    });
  }

  async emitSignalTriggers(
    principal: CurrentPrincipal,
    organizationId: string,
    signals: CanonicalAiSignal[],
  ) {
    const matchingSignals = signals.filter((signal) =>
      [
        'revenue_drop',
        'order_slowdown',
        'customer_slowdown',
        'demand_spike',
        'unusual_change',
        'sync_issue',
        'payment_visibility_gap',
        'data_coverage_limit',
      ].includes(signal.type),
    );

    const results = [];

    for (const signal of matchingSignals) {
      const orchestration = this.getSignalTriggerDefinition(signal);
      if (!orchestration) {
        continue;
      }

      const fingerprint =
        typeof signal.metadata?.fingerprint === 'string'
          ? signal.metadata.fingerprint
          : signal.type;

      results.push(
        await this.processTrigger(
          {
            organizationId,
            agentKey: orchestration.agentKey,
            triggerType: AgentTriggerEventType.SIGNAL_TRIGGERED,
            source: AgentTriggerEventSource.SIGNAL,
            sourceId: signal.id,
            reason: orchestration.reason,
            dedupeKey: `${organizationId}:${orchestration.agentKey}:signal:${signal.type}:${fingerprint}`,
            metadata: {
              signalId: signal.id,
              signalType: signal.type,
              signalSeverity: signal.severity,
              signalFingerprint: fingerprint,
            } as Prisma.InputJsonValue,
          },
          {
            createRunDto: {
              organizationId,
              agentCode: orchestration.agentKey,
              triggerType: AgentTriggerType.EVENT_DRIVEN,
            },
            cooldownMs: SIGNAL_TRIGGER_COOLDOWN_MS,
          },
        ),
      );
    }

    return results;
  }

  async emitExecutionFollowupTrigger(input: {
    organizationId: string;
    executionId: string;
    executionType: string;
    executionStatus: string;
    reason: string;
    agentKey: CommerceAgentKey;
  }) {
    return this.processTrigger(
      {
        organizationId: input.organizationId,
        agentKey: input.agentKey,
        triggerType: AgentTriggerEventType.EXECUTION_FOLLOWUP,
        source: AgentTriggerEventSource.ACTION_EXECUTION,
        sourceId: input.executionId,
        reason: input.reason,
        dedupeKey: `${input.organizationId}:${input.agentKey}:execution:${input.executionId}:${input.executionStatus}`,
        metadata: {
          executionId: input.executionId,
          executionType: input.executionType,
          executionStatus: input.executionStatus,
        } as Prisma.InputJsonValue,
      },
      {
        createRunDto: {
          organizationId: input.organizationId,
          agentCode: input.agentKey,
          triggerType: AgentTriggerType.EVENT_DRIVEN,
        },
        cooldownMs: EXECUTION_FOLLOWUP_COOLDOWN_MS,
      },
    );
  }

  async emitOnboardingCompletionTrigger(
    principal: CurrentPrincipal,
    organizationId: string,
    step: AiOnboardingStep,
  ) {
    return this.processTrigger(
      {
        organizationId,
        agentKey: 'commerce_health_agent',
        triggerType: AgentTriggerEventType.SIGNAL_TRIGGERED,
        source: AgentTriggerEventSource.ONBOARDING,
        sourceId: step,
        reason: 'Initial onboarding completed enough to generate an updated commerce health view.',
        dedupeKey: `${organizationId}:commerce_health_agent:onboarding:${step}`,
        metadata: {
          onboardingStep: step,
        } as Prisma.InputJsonValue,
      },
      {
        principal,
        createRunDto: {
          organizationId,
          agentCode: 'commerce_health_agent',
          triggerType: AgentTriggerType.EVENT_DRIVEN,
        },
        cooldownMs: SIGNAL_TRIGGER_COOLDOWN_MS,
      },
    );
  }

  private async runScheduledPass() {
    const organizationIds = await this.getSchedulableOrganizationIds();

    for (const organizationId of organizationIds) {
      await this.emitScheduledTriggersForOrganization(organizationId);
    }
  }

  private async emitScheduledTriggersForOrganization(organizationId: string) {
    const now = new Date();
    const results: Array<Record<string, unknown>> = [];
    const dateKey = now.toISOString().slice(0, 10);

    if (now.getUTCHours() === DAILY_SCHEDULE_HOUR_UTC) {
      results.push(
        await this.processTrigger(
          {
            organizationId,
            agentKey: 'commerce_health_agent',
            triggerType: AgentTriggerEventType.SCHEDULED,
            source: AgentTriggerEventSource.SCHEDULER,
            reason: 'Daily commerce health review window opened.',
            dedupeKey: `${organizationId}:commerce_health_agent:scheduled:${dateKey}`,
            metadata: {
              schedule: 'daily_commerce_health',
              scheduleWindow: dateKey,
            } as Prisma.InputJsonValue,
          },
          {
            createRunDto: {
              organizationId,
              agentCode: 'commerce_health_agent',
              triggerType: AgentTriggerType.SCHEDULED,
            },
            cooldownMs: 24 * 60 * 60 * 1000,
          },
        ),
      );
    }

    const hourlyTrustSignal = await this.prismaService.aiSignal.findFirst({
      where: {
        organizationId,
        isActive: true,
        type: {
          in: ['sync_issue', 'payment_visibility_gap', 'data_coverage_limit'],
        },
      },
      orderBy: [{ detectedAt: 'desc' }],
      select: { id: true, type: true, title: true },
    });

    if (hourlyTrustSignal) {
      const hourKey = now.toISOString().slice(0, 13);
      results.push(
        await this.processTrigger(
          {
            organizationId,
            agentKey: 'integration_guard_agent',
            triggerType: AgentTriggerEventType.SCHEDULED,
            source: AgentTriggerEventSource.SCHEDULER,
            sourceId: hourlyTrustSignal.id,
            reason: `Scheduled integration guard review because ${hourlyTrustSignal.type.replaceAll('_', ' ')} remains active.`,
            dedupeKey: `${organizationId}:integration_guard_agent:scheduled:${hourKey}:${hourlyTrustSignal.type}`,
            metadata: {
              schedule: 'hourly_integration_guard',
              scheduleWindow: hourKey,
              signalType: hourlyTrustSignal.type,
            } as Prisma.InputJsonValue,
          },
          {
            createRunDto: {
              organizationId,
              agentCode: 'integration_guard_agent',
              triggerType: AgentTriggerType.SCHEDULED,
            },
            cooldownMs: 60 * 60 * 1000,
          },
        ),
      );
    }

    return results;
  }

  private async processTrigger(
    trigger: TriggerEventInput,
    input: {
      principal?: CurrentPrincipal;
      createRunDto: CreateAgentRunDto;
      cooldownMs: number;
    },
  ) {
    const recentDuplicate = await this.prismaService.agentTriggerEvent.findFirst({
      where: {
        organizationId: trigger.organizationId,
        dedupeKey: trigger.dedupeKey,
        createdAt: {
          gte: new Date(Date.now() - input.cooldownMs),
        },
        status: {
          in: [
            AgentTriggerEventStatus.PENDING,
            AgentTriggerEventStatus.PROCESSED,
            AgentTriggerEventStatus.SKIPPED,
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (recentDuplicate) {
      const skipped = await this.prismaService.agentTriggerEvent.create({
        data: {
          organizationId: trigger.organizationId,
          agentKey: trigger.agentKey,
          triggerType: trigger.triggerType,
          source: trigger.source,
          sourceId: trigger.sourceId ?? null,
          reason: trigger.reason,
          dedupeKey: trigger.dedupeKey,
          status: AgentTriggerEventStatus.SKIPPED,
          processedAt: new Date(),
          metadata: {
            ...(this.asRecord(trigger.metadata) ?? {}),
            skippedBecause: 'cooldown',
            duplicateTriggerId: recentDuplicate.id,
          } as Prisma.InputJsonValue,
        },
      });

      return this.toTriggerView(skipped);
    }

    const activeRun = await this.prismaService.agentRun.findFirst({
      where: {
        organizationId: trigger.organizationId,
        status: {
          in: ['RUNNING', 'WAITING_APPROVAL'],
        },
        agentDefinition: {
          code: trigger.agentKey,
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: { id: true },
    });

    if (activeRun) {
      const skipped = await this.prismaService.agentTriggerEvent.create({
        data: {
          organizationId: trigger.organizationId,
          agentKey: trigger.agentKey,
          triggerType: trigger.triggerType,
          source: trigger.source,
          sourceId: trigger.sourceId ?? null,
          reason: trigger.reason,
          dedupeKey: trigger.dedupeKey,
          status: AgentTriggerEventStatus.SKIPPED,
          processedAt: new Date(),
          metadata: {
            ...(this.asRecord(trigger.metadata) ?? {}),
            skippedBecause: 'active_run',
            activeRunId: activeRun.id,
          } as Prisma.InputJsonValue,
        },
      });

      return this.toTriggerView(skipped);
    }

    const event = await this.prismaService.agentTriggerEvent.create({
      data: {
        organizationId: trigger.organizationId,
        agentKey: trigger.agentKey,
        triggerType: trigger.triggerType,
        source: trigger.source,
        sourceId: trigger.sourceId ?? null,
        reason: trigger.reason,
        dedupeKey: trigger.dedupeKey,
        status: AgentTriggerEventStatus.PENDING,
        metadata: trigger.metadata ?? Prisma.JsonNull,
      },
    });

    try {
      const run = input.principal
        ? await this.agentRuntimeService.createRun(input.principal, {
            ...input.createRunDto,
            inputContext: {
              ...(input.createRunDto.inputContext ?? {}),
              orchestration: {
                triggerEventId: event.id,
                triggerType: this.toTriggerTypeView(trigger.triggerType),
                source: this.toTriggerSourceView(trigger.source),
                sourceId: trigger.sourceId ?? null,
                reason: trigger.reason,
                dedupeKey: trigger.dedupeKey,
              },
            },
          })
        : await this.agentRuntimeService.createAutomatedRun(
            {
              ...input.createRunDto,
              inputContext: {
                ...(input.createRunDto.inputContext ?? {}),
                orchestration: {
                  triggerEventId: event.id,
                  triggerType: this.toTriggerTypeView(trigger.triggerType),
                  source: this.toTriggerSourceView(trigger.source),
                  sourceId: trigger.sourceId ?? null,
                  reason: trigger.reason,
                  dedupeKey: trigger.dedupeKey,
                },
              },
            },
            'orchestration',
          );

      const runResponse = run as {
        data: {
          id: string;
        };
      };

      const updated = await this.prismaService.agentTriggerEvent.update({
        where: { id: event.id },
        data: {
          status: AgentTriggerEventStatus.PROCESSED,
          processedAt: new Date(),
          agentRunId: String(runResponse.data.id),
        },
        include: {
          agentRun: {
            select: {
              id: true,
              status: true,
              summary: true,
            },
          },
        },
      });

      return this.toTriggerView(updated);
    } catch (error) {
      const updated = await this.prismaService.agentTriggerEvent.update({
        where: { id: event.id },
        data: {
          status: AgentTriggerEventStatus.FAILED,
          processedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : 'Unknown orchestration failure',
        },
      });

      return this.toTriggerView(updated);
    }
  }

  private getSignalTriggerDefinition(signal: CanonicalAiSignal) {
    switch (signal.type) {
      case 'revenue_drop':
      case 'order_slowdown':
      case 'demand_spike':
      case 'unusual_change':
        return {
          agentKey: 'revenue_monitor_agent' as const,
          reason: `Revenue monitor review triggered by ${signal.title.toLowerCase()}.`,
        };
      case 'customer_slowdown':
        return {
          agentKey: 'customer_momentum_agent' as const,
          reason: 'Customer momentum review triggered by a customer slowdown signal.',
        };
      case 'sync_issue':
      case 'payment_visibility_gap':
      case 'data_coverage_limit':
        return {
          agentKey: 'integration_guard_agent' as const,
          reason: `Integration guard review triggered by ${signal.title.toLowerCase()}.`,
        };
      default:
        return null;
    }
  }

  private async getSchedulableOrganizationIds() {
    const [shopifyStores, onboarded] = await Promise.all([
      this.prismaService.integrationShopifyStore.findMany({
        where: { isActive: true },
        select: { organizationId: true },
        distinct: ['organizationId'],
      }),
      this.prismaService.aiOnboardingStatus.findMany({
        where: { onboardingCompleted: true },
        select: { organizationId: true },
      }),
    ]);

    return Array.from(
      new Set(
        [...shopifyStores.map((item) => item.organizationId), ...onboarded.map((item) => item.organizationId)],
      ),
    );
  }

  private toTriggerView(
    item: {
      id: string;
      organizationId: string;
      agentKey: string;
      triggerType: AgentTriggerEventType;
      source: AgentTriggerEventSource;
      sourceId: string | null;
      reason: string;
      dedupeKey: string;
      status: AgentTriggerEventStatus;
      metadata: Prisma.JsonValue | null;
      errorMessage?: string | null;
      createdAt: Date;
      processedAt: Date | null;
      agentRun?: { id: string; status: string; summary: string | null } | null;
    },
  ) {
    return {
      id: item.id,
      organizationId: item.organizationId,
      agentKey: item.agentKey,
      triggerType: this.toTriggerTypeView(item.triggerType),
      source: this.toTriggerSourceView(item.source),
      sourceId: item.sourceId,
      reason: item.reason,
      dedupeKey: item.dedupeKey,
      status: this.toTriggerStatusView(item.status),
      metadata: item.metadata,
      errorMessage: item.errorMessage ?? null,
      createdAt: item.createdAt,
      processedAt: item.processedAt,
      agentRun: item.agentRun ?? null,
    };
  }

  private toTriggerTypeEnum(value: string) {
    switch (value) {
      case 'scheduled':
        return AgentTriggerEventType.SCHEDULED;
      case 'signal_triggered':
        return AgentTriggerEventType.SIGNAL_TRIGGERED;
      case 'execution_followup':
        return AgentTriggerEventType.EXECUTION_FOLLOWUP;
      default:
        return AgentTriggerEventType.MANUAL;
    }
  }

  private toTriggerStatusEnum(value: string) {
    switch (value) {
      case 'processed':
        return AgentTriggerEventStatus.PROCESSED;
      case 'skipped':
        return AgentTriggerEventStatus.SKIPPED;
      case 'failed':
        return AgentTriggerEventStatus.FAILED;
      default:
        return AgentTriggerEventStatus.PENDING;
    }
  }

  private toTriggerTypeView(value: AgentTriggerEventType) {
    return value.toLowerCase();
  }

  private toTriggerSourceView(value: AgentTriggerEventSource) {
    return value.toLowerCase();
  }

  private toTriggerStatusView(value: AgentTriggerEventStatus) {
    return value.toLowerCase();
  }

  private asRecord(value: Prisma.InputJsonValue | Prisma.JsonValue | undefined | null) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }
}
