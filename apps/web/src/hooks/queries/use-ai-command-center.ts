'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiService } from '@/services/ai.service';

export function useAiOverview() {
  return useQuery({
    queryKey: ['ai-overview'],
    queryFn: () => aiService.getOverview(),
  });
}

export function useAgentRuns(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['ai-agent-runs', params],
    queryFn: () => aiService.listRuns(params),
  });
}

export function useAgentRun(id?: string) {
  return useQuery({
    queryKey: ['ai-agent-run', id],
    queryFn: () => aiService.getRun(id as string),
    enabled: Boolean(id),
  });
}

export function useAgentProposals(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['ai-agent-proposals', params],
    queryFn: () => aiService.listProposals(params),
  });
}

export function useApproveProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerComment }: { id: string; reviewerComment?: string }) =>
      aiService.approveProposal(id, reviewerComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent-runs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-overview'] });
    },
  });
}

export function useRejectProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewerComment }: { id: string; reviewerComment?: string }) =>
      aiService.rejectProposal(id, reviewerComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent-runs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-overview'] });
    },
  });
}

export function useCreateAgentRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      agentCode: string;
      organizationId: string;
      triggerType?: string;
      entityType?: string;
      entityId?: string;
      inputContext?: Record<string, unknown>;
    }) => aiService.createRun(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-runs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-overview'] });
    },
  });
}

export function usePolicyViolations(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['ai-policy-violations', params],
    queryFn: () => aiService.listPolicyViolations(params),
  });
}

export function useAiMetrics() {
  return useQuery({
    queryKey: ['ai-metrics'],
    queryFn: () => aiService.getMetrics(),
  });
}

export function useObservabilityRecords(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['ai-observability', params],
    queryFn: () => aiService.listObservabilityRecords(params),
  });
}

export function useAiOnboarding(organizationId?: string) {
  return useQuery({
    queryKey: ['ai-onboarding', organizationId],
    queryFn: () => aiService.getOnboardingStatus(organizationId),
  });
}

export function useRefreshAiOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organizationId?: string) => aiService.refreshOnboardingStatus(organizationId),
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-onboarding', organizationId] });
    },
  });
}

export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ step, organizationId }: { step: string; organizationId?: string }) =>
      aiService.completeOnboardingStep(step, organizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-onboarding', variables.organizationId] });
    },
  });
}

export function useActions(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['ai-actions', params],
    queryFn: () => aiService.listActions(params),
  });
}

export function useAction(id: string) {
  return useQuery({
    queryKey: ['ai-action', id],
    queryFn: () => aiService.getAction(id),
    enabled: !!id,
  });
}

export function useExecuteAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, organizationId }: { proposalId: string; organizationId?: string }) =>
      aiService.executeAction(proposalId, organizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-actions', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent-proposals'] });
    },
  });
}

export function useApproveAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, organizationId }: { id: string; note?: string; organizationId?: string }) =>
      aiService.approveAction(id, note, organizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-action', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
    },
  });
}

export function useRejectAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, organizationId }: { id: string; note?: string; organizationId?: string }) =>
      aiService.rejectAction(id, note, organizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-action', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
    },
  });
}

export function useRecordOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      executionId: string;
      outcomeType: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN';
      outcomeScore?: number;
      impactMetrics?: Record<string, unknown>;
      notes?: string;
    }) => aiService.recordOutcome(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-action', variables.executionId] });
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] });
    },
  });
}

export function useLearningInsights(organizationId?: string) {
  return useQuery({
    queryKey: ['ai-learning-insights', organizationId],
    queryFn: () => aiService.getLearningInsights(organizationId),
    enabled: Boolean(organizationId),
  });
}
