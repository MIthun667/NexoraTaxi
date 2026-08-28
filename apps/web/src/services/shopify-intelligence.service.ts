import { apiClient } from '@/lib/api-client';
import { toPaginatedResult } from '@/lib/api-client';
import {
  ConnectedStoreStatus,
  ExecutiveAnswerResponse,
  ExecutiveCopilotResponse,
  OutcomeAnalyticsResponse,
  PortfolioExecutiveResponse,
  ScenarioAnalysisResponse,
  ScenarioPlanningOption,
  StrategicArtifactLink,
  StrategicReviewReport,
  StrategicPlanningWorkspaceResponse,
  StrategicPriority,
  StrategicPriorityCandidate,
  StrategicOutcomeSummary,
  StrategicScenarioLink,
  ShopifyActionProposal,
  CommerceDataTrustStatus,
  ShopifyAiDailySummary,
  ShopifyAiExecutiveSummary,
  ShopifyAiInsight,
  ShopifyAiRecommendation,
  ShopifyAiSignal,
  ShopifyAiWeeklyDigest,
} from '@/types/shopify-intelligence';
import { ShopifyDailyBrief } from '@/types/daily-brief';

type ScopedQuery = {
  organizationId: string;
};

type SignalQuery = ScopedQuery & {
  type?: string;
  severity?: string;
  affectedArea?: string;
  freshnessStatus?: string;
};

type RecommendationQuery = ScopedQuery & {
  type?: string;
  urgency?: string;
  affectedArea?: string;
  confidence?: string;
  status?: string;
};

type PortfolioExecutiveQuery = {
  status?: string;
  trustState?: string;
  attentionOnly?: boolean;
};

export const shopifyIntelligenceService = {
  getTodaySummary(query: ScopedQuery) {
    return apiClient
      .get<ShopifyAiDailySummary>('/ai/summary/today', { query })
      .then((response) => response.data);
  },
  getTodayExecutiveSummary(query: ScopedQuery) {
    return apiClient
      .get<ShopifyAiExecutiveSummary>('/ai/executive-summary/today', { query })
      .then((response) => response.data);
  },
  getDailyBrief(query: ScopedQuery) {
    return apiClient
      .get<ShopifyDailyBrief>('/ai/daily-brief', { query })
      .then((response) => response.data);
  },
  getExecutiveCopilot(query: ScopedQuery) {
    return apiClient
      .get<ExecutiveCopilotResponse>('/intelligence/executive-copilot', { query })
      .then((response) => response.data);
  },
  refreshExecutiveCopilot(query: ScopedQuery) {
    return apiClient
      .post<ExecutiveCopilotResponse>('/intelligence/executive-copilot/refresh', query)
      .then((response) => response.data);
  },
  getPortfolioExecutive(query?: PortfolioExecutiveQuery) {
    return apiClient
      .get<PortfolioExecutiveResponse>('/intelligence/portfolio-executive', { query })
      .then((response) => response.data);
  },
  refreshPortfolioExecutive(query?: PortfolioExecutiveQuery) {
    return apiClient
      .post<PortfolioExecutiveResponse>('/intelligence/portfolio-executive/refresh', query ?? {})
      .then((response) => response.data);
  },
  askExecutiveQuestion(input: ScopedQuery & { question: string }) {
    return apiClient
      .post<ExecutiveAnswerResponse>('/intelligence/executive-qa/ask', input)
      .then((response) => response.data);
  },
  getExecutiveQaSuggestions() {
    return apiClient
      .get<{ suggestions: string[] }>('/intelligence/executive-qa/suggestions')
      .then((response) => response.data.suggestions);
  },
  analyzeScenario(input: ScopedQuery & {
    scenarioType: string;
    proposalId?: string;
    actionExecutionType?: string;
  }) {
    return apiClient
      .post<ScenarioAnalysisResponse>('/intelligence/scenario-planning/analyze', input)
      .then((response) => response.data);
  },
  getScenarioPlanningOptions() {
    return apiClient
      .get<{ options: ScenarioPlanningOption[] }>('/intelligence/scenario-planning/options')
      .then((response) => response.data.options);
  },
  getStrategicPlan(query: ScopedQuery & { planningWindow?: string }) {
    return apiClient
      .get<StrategicPlanningWorkspaceResponse>('/intelligence/strategic-plan', { query })
      .then((response) => response.data);
  },
  createStrategicPlan(input: ScopedQuery & { title?: string; planningWindow?: string; status?: string }) {
    return apiClient
      .post<StrategicPlanningWorkspaceResponse>('/intelligence/strategic-plan', input)
      .then((response) => response.data);
  },
  updateStrategicPlan(input: { planId: string; title?: string; planningWindow?: string; status?: string }) {
    const { planId, ...body } = input;
    return apiClient
      .patch<StrategicPlanningWorkspaceResponse>(`/intelligence/strategic-plan/${planId}`, body)
      .then((response) => response.data);
  },
  generateStrategicCandidates(input: { planId: string }) {
    return apiClient
      .post<StrategicPriorityCandidate[]>(`/intelligence/strategic-plan/${input.planId}/generate-candidates`, {})
      .then((response) => response.data);
  },
  createStrategicPriority(input: {
    planId: string;
    title: string;
    description: string;
    category: string;
    urgency?: string;
    status?: string;
    successCriteria?: string[];
    owner?: string;
    targetDate?: string | null;
    notes?: string;
    linkedSignals?: StrategicArtifactLink[];
    linkedRecommendations?: StrategicArtifactLink[];
    linkedProposals?: StrategicArtifactLink[];
    linkedScenarios?: StrategicScenarioLink[];
    linkedExecutions?: StrategicArtifactLink[];
    linkedAgentRuns?: StrategicArtifactLink[];
    linkedOutcomeSummary?: StrategicOutcomeSummary | null;
  }) {
    const { planId, ...body } = input;
    return apiClient
      .post<StrategicPriority>(`/intelligence/strategic-plan/${planId}/priorities`, body)
      .then((response) => response.data);
  },
  updateStrategicPriority(input: {
    planId: string;
    priorityId: string;
    title?: string;
    description?: string;
    category?: string;
    urgency?: string;
    status?: string;
    successCriteria?: string[];
    owner?: string;
    targetDate?: string | null;
    notes?: string;
    linkedSignals?: StrategicArtifactLink[];
    linkedRecommendations?: StrategicArtifactLink[];
    linkedProposals?: StrategicArtifactLink[];
    linkedScenarios?: StrategicScenarioLink[];
    linkedExecutions?: StrategicArtifactLink[];
    linkedAgentRuns?: StrategicArtifactLink[];
    linkedOutcomeSummary?: StrategicOutcomeSummary | null;
  }) {
    const { planId, priorityId, ...body } = input;
    return apiClient
      .patch<StrategicPriority>(`/intelligence/strategic-plan/${planId}/priorities/${priorityId}`, body)
      .then((response) => response.data);
  },
  getStrategicReviews(query: ScopedQuery & { reviewWindow?: string; limit?: number }) {
    return apiClient
      .get<StrategicReviewReport[]>('/intelligence/strategic-reviews', { query })
      .then((response) => response.data);
  },
  getStrategicReview(input: { reviewId: string }) {
    return apiClient
      .get<StrategicReviewReport>(`/intelligence/strategic-reviews/${input.reviewId}`)
      .then((response) => response.data);
  },
  generateStrategicReview(input: ScopedQuery & { reviewWindow?: string }) {
    return apiClient
      .post<StrategicReviewReport | null>('/intelligence/strategic-reviews/generate', input)
      .then((response) => response.data);
  },
  getOutcomeAnalytics(query: ScopedQuery & { lookbackDays?: number }) {
    return apiClient
      .get<OutcomeAnalyticsResponse>('/intelligence/outcome-analytics', { query })
      .then((response) => response.data);
  },
  refreshOutcomeAnalytics(query: ScopedQuery & { lookbackDays?: number }) {
    return apiClient
      .post<OutcomeAnalyticsResponse>('/intelligence/outcome-analytics/refresh', query)
      .then((response) => response.data);
  },
  getDataTrust(query: ScopedQuery) {
    return apiClient
      .get<CommerceDataTrustStatus>('/intelligence/data-trust', { query })
      .then((response) => response.data);
  },
  refreshDataTrust(query: ScopedQuery) {
    return apiClient
      .post<CommerceDataTrustStatus>('/intelligence/data-trust/refresh', query)
      .then((response) => response.data);
  },
  getConnectedStores(query: ScopedQuery) {
    return apiClient
      .get<ConnectedStoreStatus[]>('/intelligence/connected-stores', { query })
      .then((response) => response.data);
  },
  getConnectedStore(input: ScopedQuery & { storeId: string }) {
    const { storeId, ...query } = input;
    return apiClient
      .get<ConnectedStoreStatus>(`/intelligence/connected-stores/${storeId}`, { query })
      .then((response) => response.data);
  },
  refreshConnectedStore(input: ScopedQuery & { storeId: string }) {
    const { storeId, ...body } = input;
    return apiClient
      .post<ConnectedStoreStatus>(`/intelligence/connected-stores/${storeId}/refresh`, body)
      .then((response) => response.data);
  },
  retryConnectedStoreShopifySync(input: ScopedQuery & { storeId: string }) {
    const { storeId, ...body } = input;
    return apiClient
      .post<ConnectedStoreStatus>(`/intelligence/connected-stores/${storeId}/retry-shopify-sync`, body)
      .then((response) => response.data);
  },
  retryConnectedStoreStripeSync(input: ScopedQuery & { storeId: string }) {
    const { storeId, ...body } = input;
    return apiClient
      .post<ConnectedStoreStatus>(`/intelligence/connected-stores/${storeId}/retry-stripe-sync`, body)
      .then((response) => response.data);
  },
  generateExecutiveSummary(query: ScopedQuery) {
    return apiClient
      .post<ShopifyAiExecutiveSummary>('/ai/executive-summary/generate', query)
      .then((response) => response.data);
  },
  getCurrentWeeklyDigest(query: ScopedQuery) {
    return apiClient
      .get<ShopifyAiWeeklyDigest>('/ai/reports/weekly/current', { query })
      .then((response) => response.data);
  },
  getWeeklyDigestHistory(query: ScopedQuery & { limit?: number }) {
    return apiClient
      .get<ShopifyAiWeeklyDigest[]>('/ai/reports/weekly/history', { query })
      .then((response) => response.data);
  },
  generateWeeklyDigest(query: ScopedQuery) {
    return apiClient
      .post<ShopifyAiWeeklyDigest>('/ai/reports/weekly/generate', query)
      .then((response) => response.data);
  },
  getSignals(query: SignalQuery) {
    return apiClient
      .get<ShopifyAiSignal[]>('/intelligence/signals', { query })
      .then((response) => response.data);
  },
  refreshSignals(query: ScopedQuery) {
    return apiClient
      .post<ShopifyAiSignal[]>('/intelligence/signals/refresh', query)
      .then((response) => response.data);
  },
  getInsights(query: ScopedQuery) {
    return apiClient
      .get<ShopifyAiInsight[]>('/ai/insights', { query })
      .then((response) => response.data);
  },
  getRecommendations(query: RecommendationQuery) {
    return apiClient
      .get<ShopifyAiRecommendation[]>('/intelligence/recommendations', { query })
      .then((response) => response.data);
  },
  generateRecommendations(query: ScopedQuery) {
    return apiClient
      .post<ShopifyAiRecommendation[]>('/ai/recommendations/generate', query)
      .then((response) => response.data);
  },
  refreshRecommendations(query: ScopedQuery) {
    return apiClient
      .post<ShopifyAiRecommendation[]>('/intelligence/recommendations/refresh', query)
      .then((response) => response.data);
  },
  getActionProposals(query: ScopedQuery) {
    return apiClient
      .get<ShopifyActionProposal[]>('/intelligence/action-proposals', { query })
      .then((response) => response.data);
  },
  refreshActionProposals(query: ScopedQuery) {
    return apiClient
      .post<ShopifyActionProposal[]>('/intelligence/action-proposals/refresh', query)
      .then((response) => response.data);
  },
  createActionProposal(input: { organizationId: string; recommendationId: string; note?: string }) {
    return apiClient
      .post<ShopifyActionProposal>('/ai/action-proposals', input)
      .then((response) => response.data);
  },
  getPendingActionProposals(query: ScopedQuery & { page?: number; limit?: number }) {
    return apiClient
      .get<ShopifyActionProposal[]>('/ai/action-proposals/pending', { query })
      .then((response) => toPaginatedResult(response));
  },
  getActionProposalHistory(query: ScopedQuery & { page?: number; limit?: number }) {
    return apiClient
      .get<ShopifyActionProposal[]>('/ai/action-proposals/history', { query })
      .then((response) => toPaginatedResult(response));
  },
  submitActionProposalForReview(input: {
    organizationId: string;
    actionProposalId: string;
    note?: string;
  }) {
    return apiClient
      .post<ShopifyActionProposal>('/ai/action-proposals/review', input)
      .then((response) => response.data);
  },
  approveActionProposal(input: {
    organizationId: string;
    actionProposalId: string;
    note?: string;
  }) {
    return apiClient
      .post<ShopifyActionProposal>('/ai/action-proposals/approve', input)
      .then((response) => response.data);
  },
  rejectActionProposal(input: {
    organizationId: string;
    actionProposalId: string;
    note?: string;
  }) {
    return apiClient
      .post<ShopifyActionProposal>('/intelligence/action-proposals/reject', input)
      .then((response) => response.data);
  },
  deferActionProposal(input: {
    organizationId: string;
    actionProposalId: string;
    note?: string;
  }) {
    return apiClient
      .post<ShopifyActionProposal>('/intelligence/action-proposals/defer', input)
      .then((response) => response.data);
  },
  requestActionProposalRevision(input: {
    organizationId: string;
    actionProposalId: string;
    note?: string;
  }) {
    return apiClient
      .post<ShopifyActionProposal>('/ai/action-proposals/request-revision', input)
      .then((response) => response.data);
  },
};
