import { Injectable } from '@nestjs/common';

import { AiMetricsService } from '../governance/ai-metrics.service';
import { ObservabilityDefaults } from './observability.constants';
import { ObservabilityRepository } from './observability.repository';
import { ObservabilitySummary } from './observability.types';

@Injectable()
export class MetricsService {
  constructor(
    private readonly observabilityRepository: ObservabilityRepository,
    private readonly aiMetricsService: AiMetricsService,
  ) {}

  async getSummary(organizationId?: string | null): Promise<ObservabilitySummary> {
    const windowStart = new Date(Date.now() - ObservabilityDefaults.metricsWindowHours * 60 * 60 * 1000);
    const [openAlerts, criticalAlerts, connectorFailures24h, operationalMetrics, aiMetrics] = await Promise.all([
      this.observabilityRepository.countOpenAlerts(organizationId),
      this.observabilityRepository.countCriticalOpenAlerts(organizationId),
      this.observabilityRepository.countConnectorFailuresSince(windowStart, organizationId),
      this.observabilityRepository.aggregateOperationalMetrics(organizationId),
      organizationId ? this.aiMetricsService.getRunMetrics(organizationId) : null,
    ]);

    const overallStatus = criticalAlerts > 0 ? 'UNHEALTHY' : openAlerts > 0 ? 'DEGRADED' : 'HEALTHY';

    return {
      overallStatus,
      openAlerts,
      criticalAlerts,
      agentRuns24h: aiMetrics?.runs ?? 0,
      connectorFailures24h,
      workOrdersActive: operationalMetrics.workOrdersActive,
      incidentsOpen: operationalMetrics.incidentsOpen,
      aiAverageLatencyMs: aiMetrics?.averageReasoningLatencyMs ?? null,
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}
