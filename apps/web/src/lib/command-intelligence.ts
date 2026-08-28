import { AiOverviewData } from '@/types/ai';
import { ExecutiveOverviewData } from '@/types/executive';
import { ObservabilitySummary, PlatformHealth } from '@/types/observability';

export type IntelligenceTone = 'stable' | 'watch' | 'critical' | 'opportunity';

export type IntelligenceBannerData = {
  eyebrow: string;
  title: string;
  summary: string;
  postureLabel: string;
  tone: IntelligenceTone;
  supportingFacts: string[];
};

export type IntelligenceStripItem = {
  id: string;
  category: string;
  title: string;
  summary: string;
  tone: IntelligenceTone;
};

export type IntelligencePriorityItem = {
  id: string;
  label: string;
  value: string;
  summary: string;
  tone: IntelligenceTone;
};

export type IntelligenceActionItem = {
  id: string;
  label: string;
  reason: string;
  href?: string;
  urgency: 'Immediate' | 'Next' | 'Monitor';
  sourceAgent?: string;
  sourceAgentCode?: string;
  actionType?: string;
  proposalId?: string;
  status?: 'PENDING' | 'SENT_TO_APPROVAL' | 'SENT_TO_WORKFLOW' | 'DISMISSED' | 'EXECUTED';
  detail?: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  executionStatus?: string | null;
  approvalRequestId?: string | null;
  executionSummary?: string | null;
  organizationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OperationalIntelligenceData = {
  banner: IntelligenceBannerData;
  strip: IntelligenceStripItem[];
  priorities: IntelligencePriorityItem[];
  actions: IntelligenceActionItem[];
};

export type ExecutiveIntelligenceData = {
  banner: IntelligenceBannerData;
  strip: IntelligenceStripItem[];
};

type OperationalInputs = {
  openIncidents: number;
  activeAssignments: number;
  activeShiftsToday: number;
  pendingApprovalRequests: number;
  overdueApprovalSteps: number;
  pendingTasks: number;
  escalatedTasks: number;
  assetReadinessRate: number;
  overdueMaintenance: number;
  expiringComplianceArtifacts: number;
  availableOperators: number;
  nonCompliantOperators: number;
  activeWorkOrders: number;
  alertCount: number;
  aiOverview?: AiOverviewData | null;
  observabilitySummary?: ObservabilitySummary | null;
  platformHealth?: PlatformHealth | null;
  isTenantScopedTelemetry: boolean;
};

type ExecutiveInputs = {
  overview: ExecutiveOverviewData;
  observabilitySummary?: ObservabilitySummary | null;
  platformHealth?: PlatformHealth | null;
  isTenantScopedTelemetry: boolean;
};

export function buildOperationalIntelligence(
  inputs: OperationalInputs,
): OperationalIntelligenceData {
  const shiftGap = Math.max(inputs.activeShiftsToday - inputs.activeAssignments, 0);
  const readinessPressure =
    inputs.overdueMaintenance + inputs.expiringComplianceArtifacts + inputs.nonCompliantOperators;
  const governancePressure =
    inputs.pendingApprovalRequests + inputs.overdueApprovalSteps + inputs.pendingTasks;
  const connectorHealth = inputs.platformHealth?.checks.connectors.status ?? null;
  const connectorFailureCount = inputs.observabilitySummary?.connectorFailures24h ?? 0;
  const aiActions = inputs.aiOverview?.activity.actionsExecuted ?? 0;
  const aiApprovals = inputs.aiOverview?.activity.approvalsRequired ?? 0;

  const dominantRisk = maxOf([
    shiftGap,
    inputs.openIncidents * 2,
    readinessPressure,
    governancePressure,
  ]);

  const tone: IntelligenceTone =
    dominantRisk >= 12 || inputs.openIncidents >= 6 || inputs.overdueApprovalSteps >= 4
      ? 'critical'
      : dominantRisk >= 5 || inputs.alertCount >= 4
        ? 'watch'
        : 'stable';

  const framing = getOperationalFraming();
  const postureLabel =
    tone === 'critical'
      ? 'Immediate intervention recommended'
      : tone === 'watch'
        ? 'Watchlist posture'
        : 'Stable execution posture';

  const summary = [
    `${framing.prefix} ${formatCount(inputs.openIncidents, framing.incidentNoun)} remain open and ${formatCount(inputs.pendingApprovalRequests, 'approval request')} are waiting in queue.`,
    shiftGap > 0
      ? `${formatCount(shiftGap, framing.coverageNoun)} are not yet covered against active demand.`
      : `${framing.coveragePositive} is currently keeping pace with live demand.`,
    inputs.isTenantScopedTelemetry && connectorHealth
      ? `Connector health is ${connectorHealth.toLowerCase()}${connectorFailureCount > 0 ? `, with ${formatCount(connectorFailureCount, 'connector failure')} in the last 24 hours.` : '.'}`
      : 'Deeper connector and system telemetry remains scope-limited, so alerts and execution backlog are carrying most of the current posture signal.',
  ].join(' ');

  const supportingFacts = [
    `${inputs.assetReadinessRate}% readiness across tracked assets and systems`,
    `${formatCount(governancePressure, 'workflow or approval blocker')} visible in the execution path`,
    aiActions > 0
      ? `${formatCount(aiActions, 'AI action')} executed today with ${formatCount(aiApprovals, 'approval')} still required`
      : 'No recent AI runtime activity is available in the current feed',
  ];

  const strip: IntelligenceStripItem[] = [
    {
      id: 'risk',
      category: 'Top risk',
      title:
        inputs.openIncidents >= Math.max(4, shiftGap)
          ? framing.riskTitle
          : inputs.overdueApprovalSteps > 2
            ? framing.backlogTitle
            : framing.readinessTitle,
      summary:
        inputs.openIncidents >= Math.max(4, shiftGap)
          ? `${formatCount(inputs.openIncidents, framing.incidentNoun)} and ${formatCount(inputs.alertCount, 'alert')} are contributing the strongest near-term execution pressure.`
          : inputs.overdueApprovalSteps > 2
            ? `${formatCount(inputs.overdueApprovalSteps, 'overdue approval step')} and ${formatCount(inputs.pendingTasks, 'pending task')} are slowing throughput.`
            : `${formatCount(readinessPressure, 'readiness blocker')} remain across maintenance, compliance, and operator clearance.`,
      tone: tone === 'stable' ? 'watch' : tone,
    },
    {
      id: 'opportunity',
      category: 'Top opportunity',
      title: framing.opportunityTitle,
      summary:
        inputs.assetReadinessRate >= 80 && aiActions > 0
          ? `Readiness is holding at ${inputs.assetReadinessRate}%, and the AI runtime is already surfacing ${formatCount(aiActions, 'action')} to help execution recover faster.`
          : inputs.assetReadinessRate >= 80
            ? `Readiness remains healthy enough to shift attention from stability to backlog reduction and faster approvals.`
            : `The clearest improvement path is to recover readiness and remove avoidable blockers before demand rises again.`,
      tone: 'opportunity',
    },
    {
      id: 'priority',
      category: 'Immediate priority',
      title: framing.priorityTitle,
      summary:
        shiftGap > 0
          ? `Close ${formatCount(shiftGap, framing.coverageNoun)} first, then clear approval steps that are blocking response and reassignment.`
          : inputs.openIncidents > 0
            ? `Reduce incident response pressure first, then remove approval and workflow backlog to restore throughput.`
            : `Use the current stable window to clear lingering backlog before it becomes a customer or operations issue.`,
      tone: tone === 'critical' ? 'critical' : 'watch',
    },
  ];

  const priorities: IntelligencePriorityItem[] = [
    {
      id: 'coverage',
      label: framing.coverageLabel,
      value:
        shiftGap > 0
          ? `${formatCount(shiftGap, framing.coverageNoun)} uncovered`
          : 'Coverage holding',
      summary:
        shiftGap > 0
          ? `Active assignments are lagging live demand by ${shiftGap}.`
          : 'Current assignment volume is keeping pace with active shift demand.',
      tone: shiftGap > 3 ? 'critical' : shiftGap > 0 ? 'watch' : 'stable',
    },
    {
      id: 'backlog',
      label: framing.backlogLabel,
      value: `${formatCount(inputs.pendingApprovalRequests, 'approval')} / ${formatCount(inputs.pendingTasks, 'task')}`,
      summary: `${formatCount(inputs.overdueApprovalSteps, 'overdue step')} remain in the approval path.`,
      tone:
        inputs.overdueApprovalSteps > 2 || inputs.pendingApprovalRequests > 6
          ? 'critical'
          : governancePressure > 0
            ? 'watch'
            : 'stable',
    },
    {
      id: 'readiness',
      label: framing.readinessLabel,
      value: `${inputs.assetReadinessRate}% ready`,
      summary: `${formatCount(inputs.overdueMaintenance, 'maintenance item')} overdue and ${formatCount(inputs.expiringComplianceArtifacts, 'expiring compliance record')} approaching risk.`,
      tone:
        inputs.assetReadinessRate < 70 || readinessPressure > 5
          ? 'critical'
          : readinessPressure > 0
            ? 'watch'
            : 'stable',
    },
  ];

  const actions: IntelligenceActionItem[] = compactActions([
    shiftGap > 0
      ? {
          id: 'action-coverage',
          label: framing.coverageAction,
          reason: `${formatCount(shiftGap, framing.coverageNoun)} are still open against active demand.`,
          href: '/operations/assignments',
          urgency: 'Immediate' as const,
        }
      : null,
    inputs.openIncidents > 0
      ? {
          id: 'action-incidents',
          label: framing.incidentAction,
          reason: `${formatCount(inputs.openIncidents, framing.incidentNoun)} remain open and are still shaping the current risk posture.`,
          href: '/operations/incidents',
          urgency: inputs.openIncidents > 4 ? ('Immediate' as const) : ('Next' as const),
        }
      : null,
    governancePressure > 0
      ? {
          id: 'action-backlog',
          label: framing.backlogAction,
          reason: `${formatCount(inputs.pendingApprovalRequests, 'approval request')} and ${formatCount(inputs.pendingTasks, 'workflow task')} are constraining throughput.`,
          href: '/approvals',
          urgency: inputs.overdueApprovalSteps > 2 ? ('Immediate' as const) : ('Next' as const),
        }
      : null,
    readinessPressure > 0
      ? {
          id: 'action-readiness',
          label: framing.readinessAction,
          reason: `${formatCount(readinessPressure, 'readiness blocker')} remain across maintenance, compliance, and operator clearance.`,
          href: '/assets',
          urgency: 'Next' as const,
        }
      : null,
    aiApprovals > 0
      ? {
          id: 'action-ai',
          label: 'Review AI-proposed actions',
          reason: `${formatCount(aiApprovals, 'approval')} are still required before proposed automations can complete.`,
          href: '/ai/proposals',
          urgency: 'Monitor' as const,
        }
      : null,
  ]).slice(0, 4);

  return {
    banner: {
      eyebrow: 'Operational intelligence',
      title: framing.bannerTitle,
      summary,
      postureLabel,
      tone,
      supportingFacts,
    },
    strip,
    priorities,
    actions,
  };
}

export function buildExecutiveIntelligence(
  inputs: ExecutiveInputs,
): ExecutiveIntelligenceData {
  const companyHealth = inputs.overview.statusCards.find((item) => item.title === 'Company Health Score');
  const topRisk = inputs.overview.risks[0];
  const topRecommendation = inputs.overview.recommendations[0];
  const approvalBacklog = inputs.overview.statusCards.find((item) => item.title === 'Pending Approvals');
  const aiActions = inputs.overview.statusCards.find((item) => item.title === 'Active AI Actions');
  const observabilityLine =
    inputs.isTenantScopedTelemetry && inputs.platformHealth
      ? `${inputs.platformHealth.overallStatus} platform health${inputs.observabilitySummary ? ` with ${formatCount(inputs.observabilitySummary.criticalAlerts, 'critical alert')}` : ''}.`
      : 'Platform telemetry remains scope-limited, so the brief leans on confirmed incidents, approvals, and AI runtime activity.';
  const framing = getExecutiveFraming();

  const banner: IntelligenceBannerData = {
    eyebrow: 'Executive intelligence',
    title: framing.bannerTitle,
    summary: `${inputs.overview.summary.todayBrief} ${observabilityLine}`,
    postureLabel:
      (companyHealth?.value ?? 0) >= 82
        ? 'Leadership posture is stable'
        : (companyHealth?.value ?? 0) >= 68
          ? 'Leadership attention recommended'
          : 'Leadership intervention recommended',
    tone:
      (companyHealth?.value ?? 0) >= 82
        ? 'stable'
        : (companyHealth?.value ?? 0) >= 68
          ? 'watch'
          : 'critical',
    supportingFacts: compactFacts([
      companyHealth ? `${companyHealth.value}${companyHealth.unit ?? ''} company health score` : null,
      approvalBacklog ? `${approvalBacklog.value} approvals currently waiting in the decision path` : null,
      aiActions ? `${aiActions.value} AI actions executed today in the active runtime feed` : null,
    ]),
  };

  return {
    banner,
    strip: [
      {
        id: 'exec-risk',
        category: 'Top risk',
        title: topRisk?.title ?? framing.defaultRiskTitle,
        summary:
          topRisk?.explanation ??
          'Current risk telemetry is limited, so leadership should focus on the approval queue and active incident posture.',
        tone:
          topRisk?.severity === 'CRITICAL'
            ? 'critical'
            : topRisk?.severity === 'HIGH'
              ? 'watch'
              : 'stable',
      },
      {
        id: 'exec-opportunity',
        category: 'Top opportunity',
        title: framing.opportunityTitle,
        summary:
          (companyHealth?.value ?? 0) >= 80
            ? `The operating baseline is healthy enough to turn attention toward speed, connector reliability, and higher-confidence AI-assisted execution.`
            : `The fastest path to improvement is to remove cross-functional backlog before pressure spreads into adjacent teams and workflows.`,
        tone: 'opportunity',
      },
      {
        id: 'exec-priority',
        category: 'Immediate priority',
        title: topRecommendation?.title ?? framing.defaultPriorityTitle,
        summary:
          topRecommendation?.reason ??
          'Use the leadership queue to remove the biggest blocker currently slowing throughput.',
        tone: banner.tone === 'critical' ? 'critical' : 'watch',
      },
    ],
  };
}

function getOperationalFraming() {
  return {
    prefix: 'The operating environment is active, but',
    incidentNoun: 'incident',
    coverageNoun: 'coverage gap',
    coveragePositive: 'Execution coverage',
    riskTitle: 'Operational risk is shaping the current risk posture',
    backlogTitle: 'Governance and approval backlog are slowing execution',
    readinessTitle: 'Readiness blockers need closer watch',
    opportunityTitle: 'Stable operations create room to remove blockers before they spread',
    priorityTitle: 'Reduce the biggest live blocker first',
    bannerTitle: 'AI view of current operating pressure',
    coverageLabel: 'Execution coverage',
    backlogLabel: 'Governance backlog',
    readinessLabel: 'Readiness posture',
    coverageAction: 'Protect live coverage',
    incidentAction: 'Reduce open incidents',
    backlogAction: 'Clear governance backlog',
    readinessAction: 'Recover readiness blockers',
  };
}

function getExecutiveFraming() {
  return {
    bannerTitle: 'Executive intelligence across the universal operating model',
    opportunityTitle: 'Use current stability to improve cross-functional execution speed',
    defaultRiskTitle: 'Cross-functional operating pressure is rising',
    defaultPriorityTitle: 'Remove the current top business blocker',
  };
}

function compactActions(items: Array<IntelligenceActionItem | null>) {
  return items.filter((item): item is IntelligenceActionItem => Boolean(item));
}

function compactFacts(items: Array<string | null>) {
  return items.filter((item): item is string => Boolean(item));
}

function formatCount(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function maxOf(values: number[]) {
  return values.reduce((max, value) => (value > max ? value : max), 0);
}
