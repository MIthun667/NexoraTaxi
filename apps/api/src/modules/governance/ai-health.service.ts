import { Injectable } from '@nestjs/common';

import { GovernanceDefaults } from './governance.constants';
import { GovernanceRepository } from './governance.repository';
import { AgentHealthStatus } from './governance.types';

@Injectable()
export class AiHealthService {
  constructor(private readonly governanceRepository: GovernanceRepository) {}

  async getOrganizationHealth(organizationId: string): Promise<AgentHealthStatus> {
    const windowStart = new Date(Date.now() - GovernanceDefaults.healthWindowHours * 60 * 60 * 1000);
    const [metrics, policyViolations] = await Promise.all([
      this.governanceRepository.aggregateRunMetrics(organizationId, windowStart),
      this.governanceRepository.countRecentPolicyViolations(organizationId, windowStart),
    ]);

    const failureRate = metrics.runs > 0 ? metrics.failed / metrics.runs : 0;
    const status =
      failureRate >= 0.4 ? 'UNHEALTHY' : failureRate >= 0.2 || policyViolations > 10 ? 'DEGRADED' : 'HEALTHY';

    return {
      status,
      runsLast24h: metrics.runs,
      failureRate,
      averageLatencyMs: metrics.averageReasoningLatencyMs,
      openPolicyViolations: policyViolations,
    };
  }
}
