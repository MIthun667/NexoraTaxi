'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shopifyIntelligenceService } from '@/services/shopify-intelligence.service';
import type {
  StrategicArtifactLink,
  StrategicOutcomeSummary,
  StrategicScenarioLink,
} from '@/types/shopify-intelligence';

export function useShopifySummary(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-summary', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getTodaySummary({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useShopifyExecutiveSummary(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-executive-summary', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getTodayExecutiveSummary({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useShopifyDailyBrief(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-daily-brief', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getDailyBrief({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useExecutiveCopilot(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-executive-copilot', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getExecutiveCopilot({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function usePortfolioExecutive(filters?: {
  status?: string;
  trustState?: string;
  attentionOnly?: boolean;
}) {
  return useQuery({
    queryKey: ['shopify-ai-portfolio-executive', filters],
    queryFn: () => shopifyIntelligenceService.getPortfolioExecutive(filters),
  });
}

export function useCommerceDataTrust(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-data-trust', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getDataTrust({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useRefreshExecutiveCopilot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      shopifyIntelligenceService.refreshExecutiveCopilot({ organizationId }),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-executive-copilot', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-daily-brief', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-data-trust', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-signals', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-recommendations', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-action-proposals', organizationId],
      });
    },
  });
}

export function useRefreshPortfolioExecutive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filters?: { status?: string; trustState?: string; attentionOnly?: boolean }) =>
      shopifyIntelligenceService.refreshPortfolioExecutive(filters),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-portfolio-executive'],
      });
    },
  });
}

export function useExecutiveQaSuggestions() {
  return useQuery({
    queryKey: ['shopify-ai-executive-qa-suggestions'],
    queryFn: () => shopifyIntelligenceService.getExecutiveQaSuggestions(),
  });
}

export function useAskExecutiveQuestion() {
  return useMutation({
    mutationFn: (input: { organizationId: string; question: string }) =>
      shopifyIntelligenceService.askExecutiveQuestion(input),
  });
}

export function useScenarioPlanningOptions() {
  return useQuery({
    queryKey: ['shopify-ai-scenario-planning-options'],
    queryFn: () => shopifyIntelligenceService.getScenarioPlanningOptions(),
  });
}

export function useAnalyzeScenario() {
  return useMutation({
    mutationFn: (input: {
      organizationId: string;
      scenarioType: string;
      proposalId?: string;
      actionExecutionType?: string;
    }) => shopifyIntelligenceService.analyzeScenario(input),
  });
}

export function useStrategicPlan(organizationId?: string, planningWindow = 'current_cycle') {
  return useQuery({
    queryKey: ['shopify-ai-strategic-plan', organizationId, planningWindow],
    queryFn: () =>
      shopifyIntelligenceService.getStrategicPlan({
        organizationId: organizationId as string,
        planningWindow,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useCreateStrategicPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; title?: string; planningWindow?: string; status?: string }) =>
      shopifyIntelligenceService.createStrategicPlan(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-strategic-plan', variables.organizationId],
      });
    },
  });
}

export function useUpdateStrategicPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { planId: string; organizationId: string; title?: string; planningWindow?: string; status?: string }) =>
      shopifyIntelligenceService.updateStrategicPlan(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-strategic-plan', variables.organizationId],
      });
    },
  });
}

export function useGenerateStrategicCandidates() {
  return useMutation({
    mutationFn: (input: { planId: string }) =>
      shopifyIntelligenceService.generateStrategicCandidates(input),
  });
}

export function useCreateStrategicPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      planId: string;
      organizationId: string;
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
    }) => shopifyIntelligenceService.createStrategicPriority(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-strategic-plan', variables.organizationId],
      });
    },
  });
}

export function useUpdateStrategicPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      planId: string;
      priorityId: string;
      organizationId: string;
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
    }) => shopifyIntelligenceService.updateStrategicPriority(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-strategic-plan', variables.organizationId],
      });
    },
  });
}

export function useStrategicReviews(organizationId?: string, reviewWindow = 'current_week', limit = 6) {
  return useQuery({
    queryKey: ['shopify-ai-strategic-reviews', organizationId, reviewWindow, limit],
    queryFn: () =>
      shopifyIntelligenceService.getStrategicReviews({
        organizationId: organizationId as string,
        reviewWindow,
        limit,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useGenerateStrategicReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; reviewWindow?: string }) =>
      shopifyIntelligenceService.generateStrategicReview(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-strategic-reviews', variables.organizationId],
      });
    },
  });
}

export function useOutcomeAnalytics(organizationId?: string, lookbackDays = 30) {
  return useQuery({
    queryKey: ['shopify-ai-outcome-analytics', organizationId, lookbackDays],
    queryFn: () =>
      shopifyIntelligenceService.getOutcomeAnalytics({
        organizationId: organizationId as string,
        lookbackDays,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useRefreshOutcomeAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; lookbackDays?: number }) =>
      shopifyIntelligenceService.refreshOutcomeAnalytics(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-outcome-analytics', variables.organizationId],
      });
    },
  });
}

export function useConnectedStores(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-connected-stores', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getConnectedStores({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useConnectedStore(organizationId?: string, storeId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-connected-store', organizationId, storeId],
    queryFn: () =>
      shopifyIntelligenceService.getConnectedStore({
        organizationId: organizationId as string,
        storeId: storeId as string,
      }),
    enabled: Boolean(organizationId && storeId),
  });
}

export function useShopifyWeeklyDigest(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-weekly-digest', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getCurrentWeeklyDigest({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useShopifyWeeklyDigestHistory(organizationId?: string, limit = 8) {
  return useQuery({
    queryKey: ['shopify-ai-weekly-digest-history', organizationId, limit],
    queryFn: () =>
      shopifyIntelligenceService.getWeeklyDigestHistory({
        organizationId: organizationId as string,
        limit,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useShopifySignals(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-signals', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getSignals({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useFilteredShopifySignals(
  organizationId?: string,
  filters?: {
    severity?: string;
    affectedArea?: string;
    freshnessStatus?: string;
    type?: string;
  },
) {
  return useQuery({
    queryKey: ['shopify-ai-signals', organizationId, filters],
    queryFn: () =>
      shopifyIntelligenceService.getSignals({
        organizationId: organizationId as string,
        ...filters,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useRefreshShopifySignals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      shopifyIntelligenceService.refreshSignals({ organizationId }),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-signals', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-daily-brief', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-action-proposals', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-summary', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-data-trust', organizationId],
      });
    },
  });
}

function invalidateConnectedStoreQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  storeId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-connected-stores', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-connected-store', organizationId, storeId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-data-trust', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-daily-brief', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-signals', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-recommendations', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-action-proposals', organizationId],
  });
}

export function useRefreshConnectedStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; storeId: string }) =>
      shopifyIntelligenceService.refreshConnectedStore(input),
    onSuccess: (_data, variables) =>
      invalidateConnectedStoreQueries(queryClient, variables.organizationId, variables.storeId),
  });
}

export function useRetryConnectedStoreShopifySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; storeId: string }) =>
      shopifyIntelligenceService.retryConnectedStoreShopifySync(input),
    onSuccess: (_data, variables) =>
      invalidateConnectedStoreQueries(queryClient, variables.organizationId, variables.storeId),
  });
}

export function useRetryConnectedStoreStripeSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; storeId: string }) =>
      shopifyIntelligenceService.retryConnectedStoreStripeSync(input),
    onSuccess: (_data, variables) =>
      invalidateConnectedStoreQueries(queryClient, variables.organizationId, variables.storeId),
  });
}

export function useShopifyInsights(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-insights', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getInsights({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useShopifyRecommendations(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-recommendations', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getRecommendations({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useFilteredShopifyRecommendations(
  organizationId?: string,
  filters?: {
    urgency?: string;
    affectedArea?: string;
    confidence?: string;
    type?: string;
    status?: string;
  },
) {
  return useQuery({
    queryKey: ['shopify-ai-recommendations', organizationId, filters],
    queryFn: () =>
      shopifyIntelligenceService.getRecommendations({
        organizationId: organizationId as string,
        ...filters,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useShopifyActionProposals(organizationId?: string) {
  return useQuery({
    queryKey: ['shopify-ai-action-proposals', organizationId],
    queryFn: () =>
      shopifyIntelligenceService.getActionProposals({
        organizationId: organizationId as string,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useRefreshShopifyActionProposals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      shopifyIntelligenceService.refreshActionProposals({ organizationId }),
    onSuccess: (_data, organizationId) => {
      invalidateProposalQueries(queryClient, organizationId);
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-data-trust', organizationId],
      });
    },
  });
}

export function useShopifyPendingActionProposals(organizationId?: string, limit = 20) {
  return useQuery({
    queryKey: ['shopify-ai-action-proposals-pending', organizationId, limit],
    queryFn: () =>
      shopifyIntelligenceService.getPendingActionProposals({
        organizationId: organizationId as string,
        limit,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useShopifyActionProposalHistory(organizationId?: string, limit = 20) {
  return useQuery({
    queryKey: ['shopify-ai-action-proposals-history', organizationId, limit],
    queryFn: () =>
      shopifyIntelligenceService.getActionProposalHistory({
        organizationId: organizationId as string,
        limit,
      }),
    enabled: Boolean(organizationId),
  });
}

export function useGenerateShopifyRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      shopifyIntelligenceService.generateRecommendations({ organizationId }),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-recommendations', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-signals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-insights', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-summary', organizationId] });
    },
  });
}

export function useRefreshShopifyRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      shopifyIntelligenceService.refreshRecommendations({ organizationId }),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-recommendations', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-daily-brief', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-action-proposals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-summary', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['shopify-ai-data-trust', organizationId] });
    },
  });
}

export function useCreateShopifyActionProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; recommendationId: string; note?: string }) =>
      shopifyIntelligenceService.createActionProposal(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-action-proposals', variables.organizationId],
      });
    },
  });
}

function invalidateProposalQueries(queryClient: ReturnType<typeof useQueryClient>, organizationId: string) {
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-action-proposals', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-action-proposals-pending', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['shopify-ai-action-proposals-history', organizationId],
  });
  queryClient.invalidateQueries({
    queryKey: ['ai-notifications', organizationId],
  });
}

export function useSubmitShopifyProposalForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; actionProposalId: string; note?: string }) =>
      shopifyIntelligenceService.submitActionProposalForReview(input),
    onSuccess: (_data, variables) => invalidateProposalQueries(queryClient, variables.organizationId),
  });
}

export function useApproveShopifyProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; actionProposalId: string; note?: string }) =>
      shopifyIntelligenceService.approveActionProposal(input),
    onSuccess: (_data, variables) => invalidateProposalQueries(queryClient, variables.organizationId),
  });
}

export function useRejectShopifyProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; actionProposalId: string; note?: string }) =>
      shopifyIntelligenceService.rejectActionProposal(input),
    onSuccess: (_data, variables) => invalidateProposalQueries(queryClient, variables.organizationId),
  });
}

export function useDeferShopifyProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; actionProposalId: string; note?: string }) =>
      shopifyIntelligenceService.deferActionProposal(input),
    onSuccess: (_data, variables) => invalidateProposalQueries(queryClient, variables.organizationId),
  });
}

export function useRequestShopifyProposalRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { organizationId: string; actionProposalId: string; note?: string }) =>
      shopifyIntelligenceService.requestActionProposalRevision(input),
    onSuccess: (_data, variables) => invalidateProposalQueries(queryClient, variables.organizationId),
  });
}

export function useGenerateShopifyExecutiveSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      shopifyIntelligenceService.generateExecutiveSummary({ organizationId }),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-executive-summary', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-daily-brief', organizationId],
      });
    },
  });
}

export function useGenerateShopifyWeeklyDigest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) =>
      shopifyIntelligenceService.generateWeeklyDigest({ organizationId }),
    onSuccess: (_data, organizationId) => {
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-weekly-digest', organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['shopify-ai-weekly-digest-history', organizationId],
      });
    },
  });
}
