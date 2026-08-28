export type RetrievalType =
  | 'STATE'
  | 'HISTORY'
  | 'ANALYTICS'
  | 'RISK'
  | 'COMPLIANCE'
  | 'TIMELINE';

export interface RetrievalTimeWindow {
  from?: Date;
  to?: Date;
}

export interface RetrievalRequest {
  organizationId: string;
  agentId?: string | null;
  agentRunId?: string | null;
  targetEntityType: string;
  targetEntityId?: string | null;
  retrievalTypes: RetrievalType[];
  timeWindow?: RetrievalTimeWindow | null;
  maxRecords?: number;
  includeRelated?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface RetrievalMetricSummary {
  key: string;
  label: string;
  value: number | string | boolean | null;
  unit?: string | null;
}

export interface RetrievalRiskSignal {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export interface RetrievalBundle {
  entitySnapshot: Record<string, unknown> | null;
  relatedEntities: Array<Record<string, unknown>>;
  timelineEvents: Array<Record<string, unknown>>;
  operationalMetrics: RetrievalMetricSummary[];
  riskSignals: RetrievalRiskSignal[];
  contextNotes: string[];
}

export interface RetrievalContext {
  request: RetrievalRequest;
  startedAt: Date;
  timeoutMs: number;
}

export interface RetrievalProviderResult {
  entitySnapshot?: Record<string, unknown> | null;
  relatedEntities?: Array<Record<string, unknown>>;
  timelineEvents?: Array<Record<string, unknown>>;
  operationalMetrics?: RetrievalMetricSummary[];
  riskSignals?: RetrievalRiskSignal[];
  contextNotes?: string[];
}

export interface RetrievalProvider {
  readonly name: string;
  supports(request: RetrievalRequest): boolean;
  retrieve(context: RetrievalContext): Promise<RetrievalProviderResult>;
}
