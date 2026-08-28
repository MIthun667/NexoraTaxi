import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsageMetricType } from '@prisma/client';

import { SubscriptionService } from './subscription.service';
import { TenancyRepository } from './tenancy.repository';
import { PlatformFeatureKey } from './tenancy.types';

@Injectable()
export class PlanEnforcementService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly tenancyRepository: TenancyRepository,
  ) {}

  async assertOrganizationActive(organizationId: string) {
    const organization = await this.tenancyRepository.findOrganizationById(organizationId);
    if (!organization || organization.status === 'ARCHIVED' || organization.status === 'SUSPENDED') {
      throw new ForbiddenException('Organization is not active for platform access.');
    }
  }

  async assertFeatureEnabled(organizationId: string, feature: PlatformFeatureKey) {
    await this.assertOrganizationActive(organizationId);
    const subscription = await this.subscriptionService.getSubscriptionSnapshot(organizationId);
    if (!subscription?.featureFlags?.[feature]) {
      throw new ForbiddenException(`Feature ${feature} is not enabled for this organization.`);
    }
  }

  async assertUsageAllowed(organizationId: string, metricType: UsageMetricType, proposedUsage = 1) {
    const subscription = await this.subscriptionService.getSubscriptionSnapshot(organizationId);
    if (!subscription) {
      throw new ForbiddenException('No active subscription is configured for this organization.');
    }

    const metricMap: Record<UsageMetricType, string> = {
      AGENT_RUNS: 'agentRuns',
      AI_TOKENS: 'aiTokens',
      CONNECTOR_CALLS: 'connectorCalls',
      WORKFLOW_EXECUTIONS: 'workflowExecutions',
      REPORT_GENERATIONS: 'reportGenerations',
    };
    const limit = subscription.usageLimits?.[metricMap[metricType]] ?? 0;
    if (limit > 0) {
      // Soft enforcement placeholder: real current-period total can be checked via usage repository in next phase.
      if (proposedUsage > limit) {
        throw new ForbiddenException(`Usage for ${metricType} exceeds subscription limit.`);
      }
    }
  }
}
