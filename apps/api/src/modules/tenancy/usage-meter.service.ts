import { Injectable } from '@nestjs/common';
import { BillingEventType, Prisma, UsageMetricType } from '@prisma/client';

import { BillingService } from './billing.service';
import { TenancyRepository } from './tenancy.repository';
import { RecordUsageInput } from './tenancy.types';

@Injectable()
export class UsageMeterService {
  constructor(
    private readonly tenancyRepository: TenancyRepository,
    private readonly billingService: BillingService,
  ) {}

  async recordUsage(input: RecordUsageInput) {
    const occurredAt = input.occurredAt ?? new Date();
    const periodStart = new Date(Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(occurredAt.getUTCFullYear(), occurredAt.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const usage = await this.tenancyRepository.upsertUsage({
      organizationId: input.organizationId,
      metricType: input.metricType,
      metricValue: input.metricValue ?? 1,
      periodStart,
      periodEnd,
      metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    });

    const subscription = await this.tenancyRepository.findActiveSubscription(input.organizationId);
    const usageLimits = subscription?.plan.usageLimits && typeof subscription.plan.usageLimits === 'object' && !Array.isArray(subscription.plan.usageLimits)
      ? (subscription.plan.usageLimits as Record<string, unknown>)
      : {};
    const limit = Number(usageLimits[this.metricKey(input.metricType)] ?? 0);

    if (limit > 0 && usage.metricValue >= limit) {
      await this.billingService.recordBillingEvent({
        organizationId: input.organizationId,
        subscriptionId: subscription?.id ?? null,
        eventType: BillingEventType.USAGE_THRESHOLD_EXCEEDED,
        summary: `${input.metricType} usage exceeded the configured plan threshold.`,
        metadata: {
          metricType: input.metricType,
          metricValue: usage.metricValue,
          limit,
        },
      });
    }

    return usage;
  }

  private metricKey(metricType: UsageMetricType): string {
    switch (metricType) {
      case UsageMetricType.AGENT_RUNS:
        return 'agentRuns';
      case UsageMetricType.AI_TOKENS:
        return 'aiTokens';
      case UsageMetricType.CONNECTOR_CALLS:
        return 'connectorCalls';
      case UsageMetricType.WORKFLOW_EXECUTIONS:
        return 'workflowExecutions';
      case UsageMetricType.REPORT_GENERATIONS:
        return 'reportGenerations';
      default:
        return String(metricType);
    }
  }
}
