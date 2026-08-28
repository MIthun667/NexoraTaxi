import { apiClient, toPaginatedResult } from '@/lib/api-client';
import { PaginatedResult } from '@/types/api';
import {
  ActionExecutionView,
  AgentRunDetail,
  AgentRunListItem,
  AiMetricsData,
  AiOverviewData,
  LearningInsightsData,
  ObservabilityRecord,
  PolicyViolationItem,
  AgentProposalItem,
} from '@/types/ai';

type QueryParams = Record<string, string | number | undefined>;

export const aiService = {
  getOverview() {
    return apiClient.get<AiOverviewData>('/ai/overview').then((response) => response.data);
  },
  async listRuns(params?: QueryParams) {
    const normalizedParams = params
      ? {
          ...params,
          agentKey: params.agentCode,
        }
      : undefined;
    const response = await apiClient.get<Array<Record<string, unknown>>>('/intelligence/agents/runs', {
      query: normalizedParams,
    });

    return {
      items: response.data.map((item) => {
        const inputContext =
          item.inputContext && typeof item.inputContext === 'object'
            ? (item.inputContext as Record<string, unknown>)
            : null;
        const orchestration =
          inputContext &&
          'orchestration' in inputContext &&
          inputContext.orchestration &&
          typeof inputContext.orchestration === 'object'
            ? (inputContext.orchestration as Record<string, unknown>)
            : null;

        return {
          id: String(item.id),
          agentName: String(item.agentName ?? 'Commerce Agent'),
          agentCode: String(item.agentCode ?? 'agent'),
          triggerType: String(item.triggerType ?? 'MANUAL'),
          triggerSource: (item.triggerSource as string | null) ?? null,
          triggerReason:
            orchestration && typeof orchestration.reason === 'string'
              ? orchestration.reason
              : null,
          targetEntityType: (item.entityType as string | null) ?? null,
          targetEntityId: (item.entityId as string | null) ?? null,
          status: String(item.status ?? 'UNKNOWN'),
          summary: (item.summary as string | null) ?? null,
          startedAt: String(item.startedAt),
          finishedAt:
            (item.completedAt as string | null) ??
            (item.failedAt as string | null) ??
            (item.cancelledAt as string | null) ??
            null,
          confidence: null,
          actionsProposed: Number(item.actionsProposed ?? 0),
          organizationId: (item.organizationId as string | null) ?? undefined,
        };
      }),
      meta: response.meta,
    } satisfies PaginatedResult<AgentRunListItem>;
  },
  createRun(input: {
    agentCode: string;
    organizationId: string;
    triggerType?: string;
    entityType?: string;
    entityId?: string;
    inputContext?: Record<string, unknown>;
  }) {
    return apiClient.post<Record<string, unknown>>(`/intelligence/agents/${input.agentCode}/run`, {
      organizationId: input.organizationId,
      triggerType: input.triggerType,
      entityType: input.entityType,
      entityId: input.entityId,
      inputContext: input.inputContext,
    });
  },
  async getRun(id: string): Promise<AgentRunDetail> {
    const [run, observations, decisions, proposals] = await Promise.all([
      apiClient.get<Record<string, unknown>>(`/intelligence/agents/runs/${id}`),
      apiClient.get<Array<Record<string, unknown>>>(`/agents/runs/${id}/observations`),
      apiClient.get<Array<Record<string, unknown>>>(`/agents/runs/${id}/decisions`),
      apiClient.get<Array<Record<string, unknown>>>(`/agents/runs/${id}/action-proposals`),
    ]);

    const runData = run.data as Record<string, unknown>;
    const agentDefinition = (runData.agentDefinition ?? {}) as Record<string, unknown>;
    const decisionsData = decisions.data as Array<Record<string, unknown>>;
    const inputContext =
      runData.inputContext && typeof runData.inputContext === 'object'
        ? (runData.inputContext as Record<string, unknown>)
        : null;
    const orchestration =
      inputContext &&
      'orchestration' in inputContext &&
      inputContext.orchestration &&
      typeof inputContext.orchestration === 'object'
        ? (inputContext.orchestration as Record<string, unknown>)
        : null;

    return {
      id: String(runData.id),
      agentName: String(agentDefinition.name ?? 'Commerce Agent'),
      agentCode: String(agentDefinition.code ?? 'agent'),
      organizationId: (runData.organizationId as string | null) ?? null,
      status: String(runData.status ?? 'UNKNOWN'),
      triggerSource: (runData.triggerSource as string | null) ?? null,
      triggerReason:
        orchestration && typeof orchestration.reason === 'string'
          ? orchestration.reason
          : null,
      triggerType: String(runData.triggerType ?? 'API'),
      summary: (runData.summary as string | null) ?? null,
      entityType: (runData.entityType as string | null) ?? null,
      entityId: (runData.entityId as string | null) ?? null,
      startedAt: String(runData.startedAt),
      completedAt: (runData.completedAt as string | null) ?? null,
      inputContext,
      retrievalBundle:
        runData.inputContext &&
        typeof runData.inputContext === 'object' &&
        'retrievalBundle' in (runData.inputContext as Record<string, unknown>)
          ? ((runData.inputContext as Record<string, unknown>).retrievalBundle as AgentRunDetail['retrievalBundle'])
          : null,
      observations: observations.data.map((item) => ({
        id: String(item.id),
        observationType: String(item.observationType ?? 'OBSERVATION'),
        summary: String(item.summary ?? ''),
        metadata: item.metadata,
        createdAt: String(item.createdAt),
      })),
      decisions: decisionsData.map((item) => ({
        id: String(item.id),
        decisionType: String(item.decisionType ?? 'SUMMARY'),
        summary: String(item.summary ?? ''),
        confidence: String(item.confidence ?? 'MEDIUM'),
        metadata: item.metadata,
        createdAt: String(item.createdAt),
      })),
      actionProposals: (proposals.data as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        runId: String(runData.id),
        agentName: String(agentDefinition.name ?? 'Commerce Agent'),
        actionType: String(item.actionType ?? ''),
        targetEntityType: (item.targetEntityType as string | null) ?? null,
        targetEntityId: (item.targetEntityId as string | null) ?? null,
        status: String(item.status ?? ''),
        summary: String(item.summary ?? ''),
        riskLevel: String(item.riskLevel ?? 'MEDIUM'),
        requiresApproval: Boolean(item.requiresApproval),
        confidence: decisionsData[0] ? String(decisionsData[0].confidence ?? 'MEDIUM') : null,
        payload:
          item.payload && typeof item.payload === 'object'
            ? (item.payload as Record<string, unknown>)
            : null,
        createdAt: String(item.createdAt),
        updatedAt: String(item.updatedAt),
      })),
      verificationResults: [],
      trace: [],
    } satisfies AgentRunDetail;
  },
  listProposals(params?: QueryParams) {
    return apiClient
      .get<AgentProposalItem[]>('/agents/action-proposals', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  approveProposal(id: string, reviewerComment?: string) {
    return apiClient.post(`/agents/action-proposals/${id}/review`, {
      status: 'APPROVED',
      reviewerComment: reviewerComment ?? null,
    });
  },
  rejectProposal(id: string, reviewerComment?: string) {
    return apiClient.post(`/agents/action-proposals/${id}/review`, {
      status: 'REJECTED',
      reviewerComment: reviewerComment ?? null,
    });
  },
  listPolicyViolations(params?: QueryParams) {
    return apiClient
      .get<PolicyViolationItem[]>('/ai/policy-violations', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  getMetrics() {
    return apiClient.get<AiMetricsData>('/ai/metrics').then((response) => response.data);
  },
  listObservabilityRecords(params?: QueryParams) {
    return apiClient
      .get<ObservabilityRecord[]>('/ai/observability', { query: params })
      .then((response) => toPaginatedResult(response));
  },
  getOnboardingStatus(organizationId?: string) {
    return apiClient
      .get<any>('/intelligence/onboarding-status', { query: { organizationId } })
      .then((response) => response.data);
  },
  refreshOnboardingStatus(organizationId?: string) {
    return apiClient
      .post<any>('/intelligence/onboarding/refresh', {}, { query: { organizationId } })
      .then((response) => response.data);
  },
  completeOnboardingStep(step: string, organizationId?: string) {
    return apiClient
      .post<any>('/intelligence/onboarding/complete-step', { step, organizationId })
      .then((response) => response.data);
  },
  listActions(params?: QueryParams) {
    return apiClient
      .get<ActionExecutionView[]>('/intelligence/actions', { query: params })
      .then((response) => response.data);
  },
  getAction(id: string) {
    return apiClient
      .get<ActionExecutionView>(`/intelligence/actions/${id}`)
      .then((response) => response.data);
  },
  executeAction(proposalId: string, organizationId?: string) {
    return apiClient
      .post<any>('/intelligence/actions/execute', { proposalId, organizationId })
      .then((response) => response.data);
  },
  approveAction(id: string, note?: string, organizationId?: string) {
    return apiClient
      .post<any>(`/intelligence/actions/${id}/approve`, { note, organizationId })
      .then((response) => response.data);
  },
  rejectAction(id: string, note?: string, organizationId?: string) {
    return apiClient
      .post<any>(`/intelligence/actions/${id}/reject`, { note, organizationId })
      .then((response) => response.data);
  },
  recordOutcome(input: {
    executionId: string;
    outcomeType: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN';
    outcomeScore?: number;
    impactMetrics?: Record<string, unknown>;
    notes?: string;
  }) {
    return apiClient
      .post('/intelligence/learning/outcome', input)
      .then((response) => response.data);
  },
  getLearningInsights(organizationId?: string) {
    return apiClient
      .get<LearningInsightsData>('/intelligence/learning/insights', { query: { organizationId } })
      .then((response) => response.data);
  },
};
