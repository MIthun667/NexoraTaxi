export interface AgentInsight {
  insightId?: string | null;
  insightType: string;
  insightCategory: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  sourceModule?: string | null;
  sourceSystem?: string | null;
  organizationId?: string | null;
  primarySignalIds?: string[] | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  supportingEvidence?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  recommendationSummary?: string | null;
  proposedActionIds?: string[] | null;
  generatedAt: Date;
  metadata?: Record<string, unknown> | null;
}
