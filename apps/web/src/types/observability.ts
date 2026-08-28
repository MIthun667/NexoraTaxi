export interface ObservabilitySummary {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  openAlerts: number;
  criticalAlerts: number;
  agentRuns24h: number;
  connectorFailures24h: number;
  workOrdersActive: number;
  incidentsOpen: number;
  aiAverageLatencyMs: number | null;
  lastUpdatedAt: string;
}

export interface ObservabilityHealthCheck {
  target: string;
  checkType: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  summary: string;
  responseTimeMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface PlatformHealth {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  checks: {
    database: ObservabilityHealthCheck;
    aiRuntime: ObservabilityHealthCheck;
    connectors: ObservabilityHealthCheck;
  };
  checkedAt: string;
}
