export interface ShopifyAiSignal {
  id: string;
  organizationId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  title: string;
  summary: string;
  description: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high' | string;
  freshnessStatus: 'fresh' | 'delayed' | 'stale' | string;
  affectedArea:
    | 'revenue'
    | 'orders'
    | 'customers'
    | 'products'
    | 'integrations'
    | 'payments'
    | 'data_quality'
    | string;
  evidence: string[];
  recommendedNextStep: string;
  metadata?: Record<string, unknown> | null;
  detectedAt: string;
  updatedAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface ShopifyAiInsight {
  id: string;
  organizationId: string;
  category: string;
  summary: string;
  explanation: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ShopifyAiDailySummary {
  id: string;
  organizationId: string;
  date: string;
  summary: string;
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    newCustomers: number;
    keySignalsCount: number;
    highSeveritySignalsCount: number;
    topProduct?: {
      productId?: string | null;
      title: string;
      revenue: number;
      unitsSold: number;
    } | null;
    refundTelemetryAvailable?: boolean;
  };
  createdAt: string;
}

export interface ShopifyAiExecutiveSummary {
  id: string;
  organizationId: string;
  date: string;
  summary: string;
  highlights?: string[] | null;
  risks?: string[] | null;
  recommendations?: string[] | null;
  sourceType: string;
  modelName?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyAiWeeklyDigest {
  id: string;
  organizationId: string;
  weekStartDate: string;
  weekEndDate: string;
  summary: string;
  highlights?: string[] | null;
  risks?: string[] | null;
  recommendations?: string[] | null;
  metrics: {
    commerce: {
      revenueCurrent: number;
      revenuePrevious: number;
      revenueDelta: number;
      ordersCurrent: number;
      ordersPrevious: number;
      orderDelta: number;
      newCustomersCurrent: number;
      newCustomersPrevious: number;
      customerDelta: number;
      repeatOrdersCurrent: number;
      repeatOrdersPrevious: number;
      topProductCurrent?: {
        title: string;
        revenue: number;
        unitsSold: number;
      } | null;
      topProductPrevious?: {
        title: string;
        revenue: number;
        unitsSold: number;
      } | null;
    };
    finance: {
      revenueCurrent: number;
      revenuePrevious: number;
      failedPaymentsCurrent: number;
      failedPaymentsPrevious: number;
      refundsCurrent: number;
      disputesCurrent: number;
    };
    customer: {
      totalProfiles: number;
      highValueCustomers: number;
      atRiskCustomers: number;
      dormantCustomers: number;
    };
    intelligence: {
      signalCount: number;
      highSeveritySignals: number;
      recommendationCount: number;
      criticalRecommendations: number;
      activeRisks: string[];
    };
    governance: {
      proposalsCreated: number;
      proposalsApproved: number;
      proposalsRejected: number;
      proposalsNeedsRevision: number;
      proposalsPending: number;
      reviewsCompleted: number;
    };
  };
  sourceType: string;
  modelName?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyAiRecommendation {
  id: string;
  organizationId: string;
  type: string;
  category: string;
  urgency: 'low' | 'medium' | 'high' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  title: string;
  summary: string;
  description: string;
  rationale: string;
  evidence: string[];
  expectedOutcome: string;
  affectedArea:
    | 'revenue'
    | 'orders'
    | 'customers'
    | 'products'
    | 'integrations'
    | 'payments'
    | 'data_quality'
    | string;
  confidence: 'low' | 'medium' | 'high' | string;
  status: 'active' | 'archived' | 'superseded' | string;
  relatedSignalType?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommerceDataTrustStatus {
  overallStatus: 'healthy' | 'limited' | 'issue_detected' | 'not_connected' | string;
  shopifyStatus:
    | 'connected'
    | 'limited'
    | 'delayed'
    | 'stale'
    | 'failed'
    | 'not_connected'
    | string;
  stripeStatus:
    | 'connected'
    | 'delayed'
    | 'stale'
    | 'failed'
    | 'not_connected'
    | 'not_applicable'
    | string;
  freshnessStatus: 'up_to_date' | 'delayed' | 'stale' | string;
  coverageStatus: 'full' | 'partial' | 'minimal' | 'unavailable' | string;
  limitations: string[];
  evidence: string[];
  recommendedOperatorMessage: string;
  updatedAt: string;
  integrations: {
    shopify: {
      connected: boolean;
      storeId: string | null;
      shopDomain: string | null;
      latestSyncStatus: string | null;
      latestSyncAt: string | null;
      lastSuccessfulSyncAt: string | null;
      productsAvailable: boolean;
      ordersAvailable: boolean;
      customersAvailable: boolean;
      protectedCustomerDataRequired: boolean;
    };
    stripe: {
      connected: boolean;
      accountId: string | null;
      latestSyncStatus: string | null;
      latestSyncAt: string | null;
      lastSuccessfulSyncAt: string | null;
      paymentsAvailable: boolean;
    };
  };
}

export interface ConnectedStoreStatus {
  storeId: string;
  storeName: string;
  platform: 'shopify' | string;
  connectionStatus:
    | 'connected'
    | 'connecting'
    | 'attention_required'
    | 'not_connected'
    | string;
  shopifyStatus:
    | 'connected'
    | 'limited'
    | 'delayed'
    | 'stale'
    | 'failed'
    | 'not_connected'
    | string;
  stripeStatus:
    | 'connected'
    | 'delayed'
    | 'stale'
    | 'failed'
    | 'not_connected'
    | 'not_applicable'
    | string;
  coverageStatus: 'full' | 'partial' | 'minimal' | 'unavailable' | string;
  lastSuccessfulShopifySyncAt: string | null;
  lastSuccessfulStripeSyncAt: string | null;
  latestShopifySyncState:
    | 'success'
    | 'in_progress'
    | 'delayed'
    | 'failed'
    | 'never_synced'
    | 'not_connected'
    | string;
  latestStripeSyncState:
    | 'success'
    | 'in_progress'
    | 'delayed'
    | 'failed'
    | 'never_synced'
    | 'not_connected'
    | string;
  limitations: string[];
  recommendedNextStep: string;
  actionsAvailable: Array<
    | 'reconnect_store'
    | 'retry_shopify_sync'
    | 'retry_stripe_sync'
    | 'review_permissions'
    | 'connect_payments'
    | 'wait_for_initial_sync'
    | string
  >;
  updatedAt: string;
}

export interface ShopifyActionProposal {
  id: string;
  organizationId: string;
  proposalType: string;
  type?: string;
  title: string;
  description: string;
  summary?: string;
  reason?: string;
  evidence?: string[];
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  riskLevel?: 'low' | 'medium' | 'high' | string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | 'ARCHIVED' | string;
  source: string;
  recommendedBy?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
  latestDecisionNote?: string | null;
  metadata?: {
    summary?: string;
    reason?: string;
    evidence?: string[];
    targetEntityType?: string | null;
    targetEntityId?: string | null;
    riskLevel?: 'low' | 'medium' | 'high' | string;
    recommendedBy?: string | null;
    safetyNotes?: string[];
    recommendationCategory?: string;
    recommendationId?: string;
    rationale?: string;
    [key: string]: unknown;
  } | null;
  safetyNotes?: string[];
  reviews?: ShopifyActionProposalReview[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyActionProposalReview {
  id: string;
  organizationId: string;
  actionProposalId: string;
  reviewerUserId: string;
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | 'DEFERRED' | string;
  note?: string | null;
  createdAt: string;
}

export interface ExecutiveCopilotPendingAction {
  id: string;
  kind: 'proposal' | 'execution';
  title: string;
  summary: string;
  status: string;
  priority: string;
  riskLevel: string;
  targetLabel: string | null;
  href: string;
}

export interface ExecutiveCopilotAgentHighlight {
  runId: string;
  agentKey: string;
  agentName: string;
  triggerType: string;
  triggerReason: string | null;
  status: string;
  summary: string;
  topConcern: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ScenarioPlanningOption {
  type:
    | 'revenue_slowdown_persists'
    | 'customer_slowdown_persists'
    | 'sync_issue_persists'
    | 'payments_visibility_missing'
    | 'demand_spike_continues'
    | 'no_action_taken'
    | 'action_executed'
    | string;
  title: string;
  description: string;
  supportsProposalContext: boolean;
  supportsExecutionContext: boolean;
}

export interface ScenarioAnalysisResponse {
  organizationId: string;
  generatedAt: string;
  trust: CommerceDataTrustStatus;
  scenarioType:
    | 'revenue_slowdown_persists'
    | 'customer_slowdown_persists'
    | 'sync_issue_persists'
    | 'payments_visibility_missing'
    | 'demand_spike_continues'
    | 'no_action_taken'
    | 'action_executed'
    | 'unsupported'
    | string;
  summary: string;
  inputAssumptions: string[];
  expectedEffects: string[];
  risks: string[];
  recommendedMitigations: string[];
  confidence: 'low' | 'medium' | 'high' | string;
  limitations: string[];
  followUps: string[];
}

export interface StrategicArtifactLink {
  id: string;
  title: string;
  href: string;
  detail?: string | null;
  status?: string | null;
  type?: string | null;
}

export interface StrategicScenarioLink {
  id: string;
  title: string;
  scenarioType: string;
  detail?: string | null;
}

export interface StrategicOutcomeSummary {
  summary: string;
  trend: string;
  positiveOutcomeRate: number;
}

export interface StrategicPriority {
  id: string;
  strategicPlanId: string;
  title: string;
  description: string;
  category: 'revenue' | 'customers' | 'integrations' | 'operations' | 'trust' | 'payments' | 'catalog' | string;
  status: 'identified' | 'in_progress' | 'blocked' | 'completed' | string;
  urgency: 'low' | 'medium' | 'high' | string;
  linkedSignals: StrategicArtifactLink[];
  linkedRecommendations: StrategicArtifactLink[];
  linkedProposals: StrategicArtifactLink[];
  linkedScenarios: StrategicScenarioLink[];
  linkedExecutions: StrategicArtifactLink[];
  linkedAgentRuns: StrategicArtifactLink[];
  linkedOutcomeSummary: StrategicOutcomeSummary | null;
  successCriteria: string[];
  owner: string | null;
  targetDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicPlan {
  id: string;
  organizationId: string;
  title: string;
  planningWindow: 'current_cycle' | 'next_30_days' | 'next_quarter' | string;
  status: 'draft' | 'active' | 'archived' | string;
  summary: string;
  priorities: StrategicPriority[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategicPriorityCandidate {
  candidateKey: string;
  title: string;
  description: string;
  category: 'revenue' | 'customers' | 'integrations' | 'operations' | 'trust' | 'payments' | 'catalog' | string;
  urgency: 'low' | 'medium' | 'high' | string;
  rationale: string;
  linkedSignals: StrategicArtifactLink[];
  linkedRecommendations: StrategicArtifactLink[];
  linkedProposals: StrategicArtifactLink[];
  linkedScenarios: StrategicScenarioLink[];
  linkedExecutions: StrategicArtifactLink[];
  linkedAgentRuns: StrategicArtifactLink[];
  linkedOutcomeSummary: StrategicOutcomeSummary | null;
  successCriteria: string[];
}

export interface StrategicPlanningWorkspaceResponse {
  organizationId: string;
  generatedAt: string;
  trust: CommerceDataTrustStatus;
  plan: StrategicPlan | null;
  candidatePriorities: StrategicPriorityCandidate[];
  limitations: string[];
}

export interface StrategicReviewPriorityProgressItem {
  priorityId: string;
  title: string;
  status: 'identified' | 'in_progress' | 'blocked' | 'completed' | string;
  progressState: 'improving' | 'stable' | 'blocked' | 'weakening' | 'insufficient_data' | string;
  linkedEvidence: StrategicArtifactLink[];
  nextStep: string;
}

export interface StrategicReviewSignalChange {
  id: string;
  title: string;
  severity: string;
  changeType: 'new' | 'escalated' | 'resolved' | string;
  summary: string;
  href: string;
}

export interface StrategicReviewActionReview {
  proposalsApproved: number;
  proposalsRejected: number;
  proposalsDeferred: number;
  proposalsPending: number;
  executionsCompleted: number;
  executionsFailed: number;
  executionsPending: number;
  summary: string;
  openRisks: string[];
}

export interface StrategicReviewOutcomeReview {
  positive: number;
  negative: number;
  neutral: number;
  unknown: number;
  positiveOutcomeRate: number;
  learningTrend: string;
  summary: string;
}

export interface StrategicReviewReport {
  id: string;
  organizationId: string;
  reviewWindow: 'last_7_days' | 'current_week' | 'last_30_days' | string;
  generatedAt: string;
  trust: CommerceDataTrustStatus;
  summary: string;
  priorityProgress: StrategicReviewPriorityProgressItem[];
  signalChanges: StrategicReviewSignalChange[];
  actionReview: StrategicReviewActionReview;
  outcomeReview: StrategicReviewOutcomeReview;
  scenarioNotes: string[];
  executiveFocus: string[];
  limitations: string[];
}

export interface ExecutiveCopilotLearningHighlights {
  totalActionsTracked: number;
  positiveOutcomeRate: number;
  operatorApprovalRate: number;
  summary: string;
}

export interface ExecutiveCopilotStoreStatus {
  totalStores: number;
  primaryStore: ConnectedStoreStatus | null;
  summary: string;
}

export interface ExecutiveCopilotResponse {
  organizationId: string;
  generatedAt: string;
  trust: CommerceDataTrustStatus;
  topSummary: {
    summary: string;
    whatChanged: string;
    whatMatters: string;
  };
  keySignals: ShopifyAiSignal[];
  keyRecommendations: ShopifyAiRecommendation[];
  pendingActions: ExecutiveCopilotPendingAction[];
  agentHighlights: ExecutiveCopilotAgentHighlight[];
  learningHighlights: ExecutiveCopilotLearningHighlights;
  connectedStoreStatus: ExecutiveCopilotStoreStatus;
  executiveFocus: string[];
}

export interface ExecutiveQaSource {
  type: 'trust' | 'signal' | 'recommendation' | 'action' | 'agent_run' | 'learning' | 'store' | string;
  id: string;
  title: string;
  detail?: string | null;
}

export interface ExecutiveAnswerResponse {
  answer: string;
  confidence: 'low' | 'medium' | 'high' | string;
  trustState: 'healthy' | 'limited' | 'issue_detected' | 'not_connected' | string;
  sources: ExecutiveQaSource[];
  supportingSignals: Array<{ id: string; title: string }>;
  supportingRecommendations: Array<{ id: string; title: string }>;
  supportingActions: Array<{ id: string; title: string; status: string }>;
  supportingAgentRuns: Array<{ runId: string; agentName: string; summary: string }>;
  limitations: string[];
  suggestedFollowUps: string[];
  generatedAt: string;
}

export interface OutcomeEffectivenessItem {
  type: string;
  usageCount: number;
  positiveOutcomeRate: number;
  operatorApprovalRate: number;
  executionSuccessRate: number;
}

export interface OutcomeAnalyticsResponse {
  organizationId: string;
  generatedAt: string;
  trust: CommerceDataTrustStatus;
  summary: string;
  actionVolume: {
    actionsExecuted: number;
    proposalsReviewed: number;
    approvals: number;
    rejections: number;
    deferrals: number;
    pendingReviewCount: number;
    lookbackDays: number;
  };
  outcomeSummary: {
    positive: number;
    neutral: number;
    negative: number;
    unknown: number;
    totalRecorded: number;
    positiveOutcomeRate: number;
  };
  recommendationEffectiveness: {
    topEffective: OutcomeEffectivenessItem[];
    weaker: OutcomeEffectivenessItem[];
  };
  proposalReviewPatterns: {
    approvalRate: number;
    rejectionRate: number;
    deferRate: number;
    repeatedRejectionThemes: string[];
  };
  executionReliability: {
    completed: number;
    failed: number;
    approvalPending: number;
    successRate: number;
    failureByType: Array<{
      type: string;
      failedCount: number;
      total: number;
    }>;
  };
  learningTrend: {
    status: 'improving' | 'stable' | 'weakening' | 'insufficient_data' | string;
    summary: string;
    recentPositiveOutcomeRate: number | null;
    previousPositiveOutcomeRate: number | null;
  };
  roiHighlights: string[];
  limitations: string[];
}

export interface PortfolioSignalItem {
  organizationId: string;
  organizationName: string;
  signalId: string;
  title: string;
  summary: string;
  severity: string;
  freshnessStatus: string;
}

export interface PortfolioOrganizationItem {
  organizationId: string;
  organizationName: string;
  overallStatus: 'healthy' | 'limited' | 'issue_detected' | 'not_connected' | string;
  trustStatus: 'healthy' | 'limited' | 'issue_detected' | 'not_connected' | string;
  topSummary: string;
  topSignal: PortfolioSignalItem | null;
  topRecommendation: {
    id: string;
    title: string;
    summary: string;
  } | null;
  pendingActionCount: number;
  criticalSignalCount: number;
  recentOutcomeTrend: 'improving' | 'stable' | 'weakening' | 'insufficient_data' | string;
  connectedStoreSummary: string;
  updatedAt: string;
}

export interface PortfolioExecutiveResponse {
  generatedAt: string;
  portfolioSummary: {
    summary: string;
    totalOrganizations: number;
    organizationsNeedingAttention: number;
    singleOrganizationMode: boolean;
  };
  organizations: PortfolioOrganizationItem[];
  focusList: Array<{
    organizationId: string;
    organizationName: string;
    title: string;
    reason: string;
    href: string;
    priority: 'high' | 'medium' | string;
  }>;
  trustRollup: {
    healthy: number;
    limited: number;
    issueDetected: number;
    notConnected: number;
  };
  actionRollup: {
    totalPendingProposals: number;
    totalPendingApprovals: number;
    failedExecutionsNeedingAttention: number;
  };
  outcomeRollup: {
    improving: number;
    stable: number;
    weakening: number;
    insufficientData: number;
  };
  topSignals: PortfolioSignalItem[];
  limitations: string[];
}
