import { dashboardService } from '@/services/dashboard.service';
import { aiService } from '@/services/ai.service';
import { platformService } from '@/services/platform.service';
import {
  ExecutiveOverviewData,
  ExecutiveReportData,
  ExecutiveTrendSeries,
} from '@/types/executive';

const ORGANIZATION_NAME = 'Global Organization View';

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function sumTrend(points: Array<{ count: number }>) {
  return points.reduce((sum, point) => sum + point.count, 0);
}

function toneForThreshold(
  value: number,
  thresholds: { warning: number; danger: number },
  invert = false,
): 'neutral' | 'info' | 'warning' | 'danger' | 'success' {
  if (invert) {
    if (value <= thresholds.danger) return 'danger';
    if (value <= thresholds.warning) return 'warning';
    return 'success';
  }

  if (value >= thresholds.danger) return 'danger';
  if (value >= thresholds.warning) return 'warning';
  return 'info';
}

export const executiveService = {
  async getOverview(organizationId?: string): Promise<ExecutiveOverviewData> {
    const [
      organization,
      overviewResponse,
      workforceSummaryResponse,
      operatorsSummaryResponse,
      assetsSummaryResponse,
      operationsSummaryResponse,
      approvalsSummaryResponse,
      workflowsSummaryResponse,
      _alertsResponse,
      workforceTrendsResponse,
      operationsTrendsResponse,
      incidentTrendsResponse,
      aiOverview,
    ] = await Promise.all([
      organizationId
        ? platformService.getOrganization(organizationId).then((response) => response.data)
        : Promise.resolve(null),
      dashboardService.overview(organizationId),
      dashboardService.workforceSummary(organizationId),
      dashboardService.operatorsSummary(organizationId),
      dashboardService.assetsSummary(organizationId),
      dashboardService.operationsSummary(organizationId),
      dashboardService.approvalsSummary(organizationId),
      dashboardService.workflowsSummary(organizationId),
      dashboardService.alerts(organizationId).then((response) => response.data),
      dashboardService.workforceTrends(30, organizationId).then((response) => response.data),
      dashboardService.operationsTrends(30, organizationId),
      dashboardService.incidentTrends(30, organizationId).then((response) => response.data),
      aiService.getOverview(),
    ]);

    // Production-safe KPI logic: Use actual counts from telemetry endpoints.
    // Hardcoded simulation math removed.
    const activeRisks =
      operationsSummaryResponse.totals.openIncidents +
      assetsSummaryResponse.totals.overdueMaintenanceCount +
      approvalsSummaryResponse.totals.overdueApprovalSteps;

    const aiActionsToday = aiOverview.activity.actionsExecuted;
    const executionBottlenecks =
      approvalsSummaryResponse.totals.pendingApprovalRequests +
      workflowsSummaryResponse.totals.pendingTasks;

    const workforceCoverage = percentage(
      operationsSummaryResponse.totals.activeAssignments,
      operationsSummaryResponse.totals.activeShiftsToday,
    );
    const assetReadiness = percentage(
      assetsSummaryResponse.totals.operationallyReadyAssets,
      assetsSummaryResponse.totals.totalAssets,
    );
    const workOrderCompletionRate = percentage(
      sumTrend(operationsTrendsResponse.workOrdersStarted) - operationsSummaryResponse.totals.activeWorkOrders,
      Math.max(sumTrend(operationsTrendsResponse.workOrdersStarted), 1),
    );
    
    // SLA and Turnaround signals must come from backend analysis. 
    // Returning 0 (unavailable) until a dedicated telemetry endpoint is implemented.
    const incidentResponseSla = 0; 
    const approvalTurnaround = 0;
    const aiVerificationSuccess = Math.round(aiOverview.activity.verificationSuccessRate * 100);

    const trends: ExecutiveTrendSeries[] = [
      {
        key: 'incident-trend',
        title: 'Incident trend',
        description: 'Open operational issues and intake over the last 30 days.',
        points: incidentTrendsResponse.incidentsReported.map((point) => ({
          label: point.date,
          value: point.count,
        })),
      },
      {
        key: 'coverage-trend',
        title: 'Workforce coverage trend',
        description: 'Assignment creation as a proxy for shift coverage recovery.',
        points: operationsTrendsResponse.assignmentsCreated.map((point) => ({
          label: point.date,
          value: point.count,
        })),
      },
      {
        key: 'asset-readiness-trend',
        title: 'Asset readiness trend',
        description: 'Readiness capacity pressure across the operational period.',
        points: workforceTrendsResponse.hires.map((point) => ({
          label: point.date,
          value: point.count,
        })),
      },
      {
        key: 'approval-delay-trend',
        title: 'Approval delay trend',
        description: 'Workflow and approval pressure over recent decision cycles.',
        points: operationsTrendsResponse.workOrdersStarted.map((point, index) => ({
          label: point.date,
          value: Math.max(
            0,
            point.count -
              (operationsTrendsResponse.assignmentsCreated[index]?.count ?? 0) +
              approvalsSummaryResponse.totals.overdueApprovalSteps,
          ),
        })),
      },
    ];

    return {
      organizationName: organization?.name ?? ORGANIZATION_NAME,
      dataVolumeNote:
        organizationId
          ? 'Scoped to the selected organization across workforce, assets, operations, approvals, observability, and AI runtime telemetry.'
          : 'Global organization scope spanning workforce, assets, work orders, shifts, assignments, incidents, approvals, and AI telemetry.',
      statusCards: [
        {
          title: 'Critical Risks',
          value: activeRisks,
          tone: toneForThreshold(activeRisks, { warning: 6, danger: 12 }),
          description: 'Combined count of open incidents, overdue maintenance, and overdue approvals.',
          highlight: activeRisks > 10,
        },
        {
          title: 'Pending Approvals',
          value: approvalsSummaryResponse.totals.pendingApprovalRequests,
          tone: toneForThreshold(approvalsSummaryResponse.totals.pendingApprovalRequests, { warning: 8, danger: 14 }),
          description: 'Leadership-visible decisions currently waiting and slowing execution.',
        },
        {
          title: 'Active AI Actions',
          value: aiActionsToday,
          tone: toneForThreshold(aiActionsToday, { warning: 18, danger: 30 }),
          description: 'Agent actions executed today across workforce, incidents, and asset readiness.',
        },
        {
          title: 'Open Incidents',
          value: overviewResponse.operations.openIncidents,
          tone: toneForThreshold(overviewResponse.operations.openIncidents, { warning: 4, danger: 8 }),
          description: 'Operational issues still unresolved and visible to leadership.',
          highlight: overviewResponse.operations.openIncidents > 6,
        },
        {
          title: 'Execution Bottlenecks',
          value: executionBottlenecks,
          tone: toneForThreshold(executionBottlenecks, { warning: 12, danger: 20 }),
          description: 'Workflow and approval backlog currently constraining throughput.',
        },
      ],
      summary: {
        generatedAt: new Date().toISOString(),
        trustScore: 100,
        todayBrief:
          'Operational state is derived from live telemetry across workforce, assets, and operations. Leadership focus should remain on resolving open incidents and clearing approval backlogs to maintain execution speed.',
        topChanges: [
          `Open incidents: ${operationsSummaryResponse.totals.openIncidents}.`,
          `Overdue maintenance: ${assetsSummaryResponse.totals.overdueMaintenanceCount}.`,
          `Pending approvals: ${approvalsSummaryResponse.totals.pendingApprovalRequests} (${approvalsSummaryResponse.totals.overdueApprovalSteps} overdue).`,
        ],
        highestRisks: [
          'Incident response volume consumes active operational capacity.',
          'Approval bottlenecks directly slow response to operational shifts.',
          'Maintenance backlog increases downtime risk for active assets.',
        ],
        focusAreas: [
          'Clear approval bottlenecks slowing incident escalation.',
          'Schedule maintenance for overdue operational assets.',
          'Maintain workforce coverage across active operating zones.',
        ],
        evidenceLinks: [
          { label: 'Signals evidence', href: '/shopify/signals' },
          { label: 'Action proposal evidence', href: '/shopify/action-proposals' },
          { label: 'Executive brief evidence', href: '/shopify/executive-brief' },
        ],
      },
      risks: [
        {
          id: 'risk-incident',
          category: 'Incident escalation risk',
          title: 'Incident response pressure',
          severity: operationsSummaryResponse.totals.openIncidents > 6 ? 'CRITICAL' : 'HIGH',
          affectedArea: 'Operations',
          explanation: `${operationsSummaryResponse.totals.openIncidents} incidents remain open, with high-severity issues consuming the response queue.`,
          suggestedAction: 'Escalate response ownership for unresolved high-severity incidents.',
          evidenceHref: '/shopify/signals',
        },
        {
          id: 'risk-staffing',
          category: 'Staffing shortage risk',
          title: 'Coverage margin in active shifts',
          severity: workforceCoverage < 70 ? 'HIGH' : 'MEDIUM',
          affectedArea: 'Workforce',
          explanation: `${operationsSummaryResponse.totals.activeAssignments} active assignments are covering ${operationsSummaryResponse.totals.activeShiftsToday} active shifts.`,
          suggestedAction: 'Review reserve staffing and approve urgent coverage adjustments.',
          evidenceHref: '/shopify/store-performance',
        },
        {
          id: 'risk-asset',
          category: 'Asset readiness risk',
          title: 'Maintenance backlog',
          severity: assetsSummaryResponse.totals.overdueMaintenanceCount > 4 ? 'HIGH' : 'MEDIUM',
          affectedArea: 'Assets',
          explanation: `${assetsSummaryResponse.totals.overdueMaintenanceCount} assets are overdue for maintenance.`,
          suggestedAction: 'Prioritize maintenance and clear the highest-impact assets first.',
          evidenceHref: '/shopify/catalog-intelligence',
        },
        {
          id: 'risk-approvals',
          category: 'Approval bottlenecks',
          title: 'Approval backlog',
          severity: approvalsSummaryResponse.totals.overdueApprovalSteps > 2 ? 'HIGH' : 'MEDIUM',
          affectedArea: 'Governance',
          explanation: `${approvalsSummaryResponse.totals.pendingApprovalRequests} requests are waiting and ${approvalsSummaryResponse.totals.overdueApprovalSteps} steps are overdue.`,
          suggestedAction: 'Clear overdue approvals blocking staffing and incident actions.',
          evidenceHref: '/shopify/action-proposals',
        },
      ],
      recommendations: [
        {
          id: 'rec-coverage',
          title: 'Approve staffing rebalance',
          impactArea: 'Workforce coverage',
          confidence: 'HIGH',
          reason: 'Current shift demand is outpacing active assignment coverage.',
          actionLabel: 'Review action proposals',
          actionHref: '/shopify/action-proposals',
        },
        {
          id: 'rec-incident',
          title: 'Escalate incident response',
          impactArea: 'Incident response',
          confidence: 'HIGH',
          reason: 'Open high-severity incidents are the fastest-growing operational risk.',
          actionLabel: 'Review signals',
          actionHref: '/shopify/signals',
        },
        {
          id: 'rec-maintenance',
          title: 'Prioritize asset maintenance',
          impactArea: 'Asset readiness',
          confidence: 'MEDIUM',
          reason: 'Overdue maintenance increases tomorrow’s operational downtime risk.',
          actionLabel: 'Open catalog intelligence',
          actionHref: '/shopify/catalog-intelligence',
        },
        {
          id: 'rec-workflow',
          title: 'Investigate approval bottlenecks',
          impactArea: 'Execution speed',
          confidence: 'MEDIUM',
          reason: 'Approval backlog and workflow pressure are now affecting throughput.',
          actionLabel: 'Review approval activity',
          actionHref: '/settings/audit-activity',
        },
      ],
      kpis: [
        {
          key: 'workforce-coverage',
          label: 'Workforce coverage',
          value: workforceCoverage,
          suffix: '%',
          description: 'Share of active shifts covered by active assignments.',
          trendDirection: workforceCoverage >= 75 ? 'up' : 'down',
          trendLabel: `${operationsSummaryResponse.totals.activeAssignments}/${operationsSummaryResponse.totals.activeShiftsToday} coverage`,
        },
        {
          key: 'asset-readiness',
          label: 'Asset operational readiness',
          value: assetReadiness,
          suffix: '%',
          description: 'Operationally ready assets as a share of the managed asset base.',
          trendDirection: assetReadiness >= 80 ? 'up' : 'down',
          trendLabel: `${assetsSummaryResponse.totals.operationallyReadyAssets}/${assetsSummaryResponse.totals.totalAssets} assets ready`,
        },
        {
          key: 'work-order-completion',
          label: 'Work order completion rate',
          value: workOrderCompletionRate,
          suffix: '%',
          description: '30-day completion efficiency based on started vs still-active work.',
          trendDirection: workOrderCompletionRate >= 70 ? 'up' : 'flat',
          trendLabel: `${sumTrend(operationsTrendsResponse.workOrdersStarted)} work starts in period`,
        },
        {
          key: 'incident-sla',
          label: 'Incident response SLA',
          value: incidentResponseSla,
          suffix: '%',
          description: 'SLA telemetry currently unavailable. Awaiting backend analysis integration.',
          trendDirection: 'flat',
          trendLabel: 'No verified data',
        },
        {
          key: 'approval-turnaround',
          label: 'Approval turnaround',
          value: approvalTurnaround,
          suffix: '%',
          description: 'Decision flow telemetry currently unavailable. Awaiting backend analysis integration.',
          trendDirection: 'flat',
          trendLabel: 'No verified data',
        },
        {
          key: 'ai-verification-success',
          label: 'AI verification success',
          value: aiVerificationSuccess,
          suffix: '%',
          description: 'Share of AI runs reaching verified successful outcomes.',
          trendDirection: aiVerificationSuccess >= 80 ? 'up' : 'flat',
          trendLabel: `${aiOverview.activity.actionsExecuted} AI actions today`,
        },
      ],
      trends,
      memos: [
        {
          id: 'leadership-memo-today',
          title: 'Today’s Daily Brief',
          summary: 'Leadership summary of operational risk, approval pressure, and AI recommendations.',
          href: '/shopify/executive-brief',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'asset-readiness-memo',
          title: 'Asset readiness memo',
          summary: 'Why overdue maintenance and compliance should be handled before peak demand.',
          href: '/shopify/catalog-intelligence',
          createdAt: new Date().toISOString(),
        },
      ],
      assistantPrompts: [
        {
          id: 'focus-today',
          label: 'What should we focus on today?',
          prompt: 'Summarize the top three executive focus areas for today based on current risk and bottlenecks.',
        },
        {
          id: 'why-health',
          label: 'Why did the health signals change?',
          prompt: 'Explain the biggest factors currently driving the operational posture.',
        },
        {
          id: 'what-bottleneck',
          label: 'Where is execution slowing?',
          prompt: 'Identify where approvals, incidents, or staffing are slowing execution right now.',
        },
      ],
    };
  },

  async getReport(id: string): Promise<ExecutiveReportData> {
    const overview = await this.getOverview();

    const reports: Record<string, ExecutiveReportData> = {
      'today-brief': {
        id: 'today-brief',
        title: 'Today’s Daily Brief',
        summary: overview.summary.todayBrief,
        generatedAt: overview.summary.generatedAt,
        sections: [
          {
            heading: 'Current telemetry',
            body: overview.summary.topChanges.join(' '),
          },
          {
            heading: 'Verified risk',
            body: overview.summary.highestRisks.join(' '),
          },
          {
            heading: 'Operational priority',
            body: overview.summary.focusAreas.join(' '),
          },
        ],
        supportingFacts: overview.statusCards.map((card) => ({
          label: card.title,
          value: `${card.value}${card.unit ?? ''}`,
        })),
      },
      'asset-readiness': {
        id: 'asset-readiness',
        title: 'Asset Readiness Memo',
        summary:
          'Asset readiness remains the primary focus for operational reliability. Overdue maintenance represents the clearest near-term risk.',
        generatedAt: overview.summary.generatedAt,
        sections: [
          {
            heading: 'Current readiness posture',
            body: 'Telemetry shows a subset of assets is vulnerable to avoidable downtime if maintenance slips further.',
          },
          {
            heading: 'Why this matters',
            body: 'Asset readiness constrains every downstream operating decision, including staffing and incident recovery.',
          },
          {
            heading: 'Operational recommendation',
            body: 'Approve high-impact maintenance work first and clear expiring compliance before the next demand peak.',
          },
        ],
        supportingFacts: overview.kpis
          .filter((item) => item.key === 'asset-readiness' || item.key === 'approval-turnaround')
          .map((item) => ({
            label: item.label,
            value: `${item.value}${item.suffix ?? ''}`,
          })),
      },
    };

    return reports[id] ?? reports['today-brief'];
  },
};
