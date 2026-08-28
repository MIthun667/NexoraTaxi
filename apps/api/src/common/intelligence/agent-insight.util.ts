import {
  buildSignal,
  CanonicalSignal,
  inferSignalCategory,
  SignalStatus,
} from '../signals';
import { AgentInsightCategory } from './agent-insight-category.constants';
import { AgentInsight } from './agent-insight.interface';
import { AgentInsightStatus } from './agent-insight-status.constants';
import { AgentInsightType } from './agent-insight-type.constants';

export interface AgentInsightInput {
  insightId?: string | null;
  insightType?: string | null;
  insightCategory?: string | null;
  title: string;
  summary: string;
  severity?: string | null;
  status?: string | null;
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
  generatedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

const INSIGHT_CATEGORY_FALLBACK_MAP: Record<string, string> = {
  people: AgentInsightCategory.people,
  assets: AgentInsightCategory.assets,
  operations: AgentInsightCategory.operations,
  workflows: AgentInsightCategory.workflows,
  approvals: AgentInsightCategory.approvals,
  compliance: AgentInsightCategory.compliance,
  executive: AgentInsightCategory.executive,
  notifications: AgentInsightCategory.system,
  system: AgentInsightCategory.system,
};

export function inferInsightCategoryFromSignal(signal: CanonicalSignal) {
  const category =
    signal.signalCategory ?? inferSignalCategory(signal.signalType);
  return INSIGHT_CATEGORY_FALLBACK_MAP[category] ?? AgentInsightCategory.system;
}

export function buildAgentInsight(input: AgentInsightInput): AgentInsight {
  return {
    insightId: input.insightId ?? null,
    insightType: input.insightType ?? AgentInsightType.signalDerived,
    insightCategory: input.insightCategory ?? AgentInsightCategory.system,
    title: input.title,
    summary: input.summary,
    severity: input.severity ?? buildSignal({
      signalType: 'system.placeholder',
      title: input.title,
      summary: input.summary,
    }).severity,
    status: input.status ?? AgentInsightStatus.active,
    sourceModule: input.sourceModule ?? null,
    sourceSystem: input.sourceSystem ?? null,
    organizationId: input.organizationId ?? null,
    primarySignalIds: input.primarySignalIds ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    supportingEvidence: input.supportingEvidence ?? null,
    metrics: input.metrics ?? null,
    recommendationSummary: input.recommendationSummary ?? null,
    proposedActionIds: input.proposedActionIds ?? null,
    generatedAt: input.generatedAt ?? new Date(),
    metadata: input.metadata ?? null,
  };
}

export function mapSignalToInsight(signal: CanonicalSignal): AgentInsight {
  return buildAgentInsight({
    insightId: signal.signalId ?? null,
    insightType: AgentInsightType.signalDerived,
    insightCategory: inferInsightCategoryFromSignal(signal),
    title: signal.title,
    summary: signal.summary,
    severity: signal.severity,
    status:
      signal.status === SignalStatus.informational
        ? AgentInsightStatus.informational
        : AgentInsightStatus.active,
    sourceModule: signal.sourceModule ?? null,
    sourceSystem: signal.sourceSystem ?? null,
    organizationId: signal.organizationId ?? null,
    primarySignalIds: signal.signalId ? [signal.signalId] : null,
    relatedEntityType: signal.entityType ?? null,
    relatedEntityId: signal.entityId ?? null,
    supportingEvidence: signal.evidence ?? null,
    metrics: signal.metrics ?? null,
    metadata: {
      sourceSignalType: signal.signalType,
      sourceSignalCategory: signal.signalCategory,
      ...(signal.metadata ?? {}),
    },
    generatedAt: signal.detectedAt,
  });
}
