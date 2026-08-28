export type HealthState = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface LogContext {
  event: string;
  message?: string;
  organizationId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  [key: string]: unknown;
}

export interface TraceContext {
  requestId: string | null;
  correlationId: string | null;
  organizationId: string | null;
  startedAt?: number | null;
}

export interface MetricEvent {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AlertEvent {
  organizationId?: string | null;
  sourceModule: string;
  alertType: string;
  severity: AlertSeverity;
  title: string;
  summary: string;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface HealthCheckResult {
  target: string;
  checkType: string;
  status: HealthState;
  summary: string;
  responseTimeMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ObservabilitySummary {
  overallStatus: HealthState;
  openAlerts: number;
  criticalAlerts: number;
  agentRuns24h: number;
  connectorFailures24h: number;
  workOrdersActive: number;
  incidentsOpen: number;
  aiAverageLatencyMs: number | null;
  lastUpdatedAt: string;
}
