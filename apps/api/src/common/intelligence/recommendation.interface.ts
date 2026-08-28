export interface Recommendation {
  recommendationId?: string | null;
  recommendationType: string;
  recommendationCategory: string;
  title: string;
  summary: string;
  rationale?: string | null;
  priority: string;
  status: string;
  sourceModule?: string | null;
  sourceSystem?: string | null;
  organizationId?: string | null;
  relatedInsightIds?: string[] | null;
  relatedSignalIds?: string[] | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  suggestedActionType?: string | null;
  approvalRequired?: boolean | null;
  proposedActionId?: string | null;
  estimatedImpact?: Record<string, unknown> | null;
  confidence?: number | null;
  generatedAt: Date;
  metadata?: Record<string, unknown> | null;
}
