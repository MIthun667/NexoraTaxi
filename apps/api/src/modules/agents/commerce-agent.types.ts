import { CommerceOverviewMetrics } from '../intelligence/ai-commerce-metrics.service';
import { ConnectedStoreStatus } from '../intelligence/ai-connected-stores.service';
import { CanonicalDataTrustStatus } from '../intelligence/ai-data-trust.service';
import { CanonicalAiRecommendation } from '../intelligence/ai-recommendation.service';
import { CanonicalAiSignal } from '../intelligence/ai-signal.service';

export type CommerceAgentExecutionSuggestion = {
  actionType: string;
  summary: string;
  safe: boolean;
};

export type CommerceAgentOutput = {
  summary: string;
  observations: string[];
  recommendations: string[];
  proposals: string[];
  suggestedExecutions: CommerceAgentExecutionSuggestion[];
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
};

export type CommerceAgentContext = {
  organizationId: string;
  agentKey: string;
  generatedAt: string;
  dataTrust: CanonicalDataTrustStatus;
  signals: CanonicalAiSignal[];
  dailyBrief: {
    summary: string;
    signals: string[];
    risks: string[];
    actions: string[];
  };
  recommendations: CanonicalAiRecommendation[];
  proposals: Array<Record<string, unknown>>;
  recentExecutions: Array<Record<string, unknown>>;
  learningInsights: {
    summary: {
      totalActionsTracked: number;
      positiveOutcomeRate: number;
      operatorApprovalRate: number;
    };
    recentOutcomes: Array<Record<string, unknown>>;
    recentDecisions: Array<Record<string, unknown>>;
  };
  connectedStores: ConnectedStoreStatus[];
  overviewMetrics: CommerceOverviewMetrics;
  inputContext?: Record<string, unknown>;
};
