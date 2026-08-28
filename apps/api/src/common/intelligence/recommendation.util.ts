import { CanonicalActionProposal } from '../actions';
import { AgentInsight } from './agent-insight.interface';
import { AgentInsightCategory } from './agent-insight-category.constants';
import { AgentInsightSeverity } from './agent-insight-severity.constants';
import { RecommendationCategory } from './recommendation-category.constants';
import { Recommendation } from './recommendation.interface';
import { RecommendationPriority } from './recommendation-priority.constants';
import { RecommendationStatus } from './recommendation-status.constants';
import { RecommendationType } from './recommendation-type.constants';

export interface RecommendationInput {
  recommendationId?: string | null;
  recommendationType?: string | null;
  recommendationCategory?: string | null;
  title: string;
  summary: string;
  rationale?: string | null;
  priority?: string | null;
  status?: string | null;
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
  generatedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

const RECOMMENDATION_CATEGORY_MAP: Record<string, string> = {
  [AgentInsightCategory.people]: RecommendationCategory.people,
  [AgentInsightCategory.assets]: RecommendationCategory.assets,
  [AgentInsightCategory.operations]: RecommendationCategory.operations,
  [AgentInsightCategory.workflows]: RecommendationCategory.workflows,
  [AgentInsightCategory.approvals]: RecommendationCategory.approvals,
  [AgentInsightCategory.compliance]: RecommendationCategory.compliance,
  [AgentInsightCategory.executive]: RecommendationCategory.executive,
  [AgentInsightCategory.system]: RecommendationCategory.system,
};

export function deriveRecommendationPriority(
  severity?: string | null,
): string {
  if (severity === AgentInsightSeverity.critical) {
    return RecommendationPriority.critical;
  }

  if (severity === AgentInsightSeverity.high) {
    return RecommendationPriority.high;
  }

  if (severity === AgentInsightSeverity.medium) {
    return RecommendationPriority.medium;
  }

  return RecommendationPriority.low;
}

export function buildRecommendation(
  input: RecommendationInput,
): Recommendation {
  return {
    recommendationId: input.recommendationId ?? null,
    recommendationType:
      input.recommendationType ?? RecommendationType.operationalNextStep,
    recommendationCategory:
      input.recommendationCategory ?? RecommendationCategory.system,
    title: input.title,
    summary: input.summary,
    rationale: input.rationale ?? null,
    priority:
      input.priority ?? deriveRecommendationPriority(input.metadata?.severity as string | null),
    status: input.status ?? RecommendationStatus.proposed,
    sourceModule: input.sourceModule ?? null,
    sourceSystem: input.sourceSystem ?? null,
    organizationId: input.organizationId ?? null,
    relatedInsightIds: input.relatedInsightIds ?? null,
    relatedSignalIds: input.relatedSignalIds ?? null,
    targetEntityType: input.targetEntityType ?? null,
    targetEntityId: input.targetEntityId ?? null,
    suggestedActionType: input.suggestedActionType ?? null,
    approvalRequired: input.approvalRequired ?? null,
    proposedActionId: input.proposedActionId ?? null,
    estimatedImpact: input.estimatedImpact ?? null,
    confidence: input.confidence ?? null,
    generatedAt: input.generatedAt ?? new Date(),
    metadata: input.metadata ?? null,
  };
}

export function mapInsightToRecommendation(
  insight: AgentInsight,
): Recommendation {
  return buildRecommendation({
    recommendationId: insight.insightId ?? null,
    recommendationType:
      insight.insightCategory === AgentInsightCategory.workflows
        ? RecommendationType.escalation
        : RecommendationType.operationalNextStep,
    recommendationCategory:
      RECOMMENDATION_CATEGORY_MAP[insight.insightCategory] ??
      RecommendationCategory.system,
    title: insight.title,
    summary:
      insight.recommendationSummary ??
      `Review and respond to: ${insight.summary}`,
    rationale: insight.summary,
    priority: deriveRecommendationPriority(insight.severity),
    status: RecommendationStatus.proposed,
    sourceModule: insight.sourceModule ?? null,
    sourceSystem: insight.sourceSystem ?? null,
    organizationId: insight.organizationId ?? null,
    relatedInsightIds: insight.insightId ? [insight.insightId] : null,
    relatedSignalIds: insight.primarySignalIds ?? null,
    targetEntityType: insight.relatedEntityType ?? null,
    targetEntityId: insight.relatedEntityId ?? null,
    estimatedImpact: insight.metrics ?? null,
    generatedAt: insight.generatedAt,
    metadata: {
      sourceInsightType: insight.insightType,
      sourceInsightCategory: insight.insightCategory,
      ...(insight.metadata ?? {}),
    },
  });
}

export function mapActionProposalToRecommendation(
  proposal: CanonicalActionProposal,
): Recommendation {
  return buildRecommendation({
    recommendationId: proposal.proposalId ?? null,
    recommendationType: RecommendationType.reviewAction,
    recommendationCategory: proposal.proposalCategory ?? RecommendationCategory.system,
    title: proposal.title,
    summary: proposal.summary,
    rationale: proposal.rationale ?? null,
    priority: deriveRecommendationPriority(proposal.riskLevel ?? null),
    status:
      proposal.approvalStatus === 'APPROVED'
        ? RecommendationStatus.approved
        : RecommendationStatus.proposed,
    sourceModule: proposal.sourceModule ?? null,
    sourceSystem: proposal.sourceSystem ?? null,
    organizationId: proposal.organizationId ?? null,
    targetEntityType: proposal.targetEntityType ?? null,
    targetEntityId: proposal.targetEntityId ?? null,
    suggestedActionType: proposal.requestedAction,
    approvalRequired: proposal.approvalRequired ?? null,
    proposedActionId: proposal.proposalId ?? null,
    confidence: proposal.confidence ?? null,
    generatedAt: proposal.createdAt ?? new Date(),
    metadata: proposal.metadata ?? null,
  });
}
