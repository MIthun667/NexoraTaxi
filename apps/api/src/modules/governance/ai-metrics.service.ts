import { Injectable } from '@nestjs/common';

import { GovernanceDefaults } from './governance.constants';
import { GovernanceRepository } from './governance.repository';
import { AgentRunMetrics } from './governance.types';

@Injectable()
export class AiMetricsService {
  constructor(private readonly governanceRepository: GovernanceRepository) {}

  async getRunMetrics(organizationId: string, windowDays = GovernanceDefaults.metricsWindowDays): Promise<AgentRunMetrics> {
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const metrics = await this.governanceRepository.aggregateRunMetrics(organizationId, windowStart);

    return {
      runs: metrics.runs,
      succeeded: metrics.succeeded,
      failed: metrics.failed,
      successRate: metrics.runs > 0 ? metrics.succeeded / metrics.runs : 0,
      averageReasoningLatencyMs: metrics.averageReasoningLatencyMs,
      averageDecisionConfidence: metrics.averageDecisionConfidence,
    };
  }
}
