import { Injectable } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import {
  AiExecutiveCopilotService,
  ExecutiveCopilotResponse,
} from './ai-executive-copilot.service';
import {
  AiOutcomeAnalyticsService,
  OutcomeAnalyticsResponse,
} from './ai-outcome-analytics.service';
import { QueryPortfolioExecutiveDto } from './dto/query-portfolio-executive.dto';

type PortfolioStatus = 'healthy' | 'limited' | 'issue_detected' | 'not_connected';
type PortfolioOutcomeTrend = 'improving' | 'stable' | 'weakening' | 'insufficient_data';

type PortfolioSignalItem = {
  organizationId: string;
  organizationName: string;
  signalId: string;
  title: string;
  summary: string;
  severity: string;
  freshnessStatus: string;
};

type PortfolioFocusItem = {
  organizationId: string;
  organizationName: string;
  title: string;
  reason: string;
  href: string;
  priority: 'high' | 'medium';
};

export type OrganizationPortfolioItem = {
  organizationId: string;
  organizationName: string;
  overallStatus: PortfolioStatus;
  trustStatus: PortfolioStatus;
  topSummary: string;
  topSignal: PortfolioSignalItem | null;
  topRecommendation: {
    id: string;
    title: string;
    summary: string;
  } | null;
  pendingActionCount: number;
  criticalSignalCount: number;
  recentOutcomeTrend: PortfolioOutcomeTrend;
  connectedStoreSummary: string;
  updatedAt: string;
};

export type PortfolioExecutiveResponse = {
  generatedAt: string;
  portfolioSummary: {
    summary: string;
    totalOrganizations: number;
    organizationsNeedingAttention: number;
    singleOrganizationMode: boolean;
  };
  organizations: OrganizationPortfolioItem[];
  focusList: PortfolioFocusItem[];
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
};

type OrganizationAggregate = {
  item: OrganizationPortfolioItem;
  topSignal: PortfolioSignalItem | null;
  pendingProposalCount: number;
  pendingApprovalCount: number;
  failedExecutionCount: number;
  score: number;
  limitations: string[];
};

@Injectable()
export class AiPortfolioExecutiveService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiExecutiveCopilotService: AiExecutiveCopilotService,
    private readonly aiOutcomeAnalyticsService: AiOutcomeAnalyticsService,
  ) {}

  async getPortfolioExecutive(principal: CurrentPrincipal, query: QueryPortfolioExecutiveDto) {
    const payload = await this.getPortfolioExecutivePayload(principal, query);

    return buildSuccessResponse('Portfolio executive view retrieved successfully.', payload);
  }

  async refreshPortfolioExecutive(principal: CurrentPrincipal, dto: QueryPortfolioExecutiveDto) {
    const payload = await this.getPortfolioExecutivePayload(principal, dto, true);

    return buildSuccessResponse('Portfolio executive view refreshed successfully.', payload);
  }

  async getPortfolioExecutivePayload(
    principal: CurrentPrincipal,
    query: QueryPortfolioExecutiveDto,
    forceRefresh = false,
  ): Promise<PortfolioExecutiveResponse> {
    const organizations = await this.getAccessibleOrganizations(principal);
    const aggregates = await Promise.all(
      organizations.map((organization) =>
        this.buildOrganizationAggregate(principal, organization.id, organization.name, forceRefresh),
      ),
    );

    const filtered = this.applyFilters(aggregates, query).sort((left, right) => right.score - left.score);
    const trustRollup = this.buildTrustRollup(filtered);
    const actionRollup = this.buildActionRollup(filtered);
    const outcomeRollup = this.buildOutcomeRollup(filtered);
    const topSignals = filtered
      .map((aggregate) => aggregate.topSignal)
      .filter((signal): signal is PortfolioSignalItem => Boolean(signal))
      .sort((left, right) => this.signalPriority(right) - this.signalPriority(left))
      .slice(0, 5);
    const limitations = this.buildLimitations(filtered, organizations.length);
    const focusList = this.buildFocusList(filtered);

    return {
      generatedAt: new Date().toISOString(),
      portfolioSummary: {
        summary: this.buildPortfolioSummary({
          organizationCount: filtered.length,
          trustRollup,
          actionRollup,
          outcomeRollup,
          limitations,
        }),
        totalOrganizations: filtered.length,
        organizationsNeedingAttention:
          trustRollup.limited + trustRollup.issueDetected + trustRollup.notConnected,
        singleOrganizationMode: filtered.length <= 1,
      },
      organizations: filtered.map((aggregate) => aggregate.item),
      focusList,
      trustRollup,
      actionRollup,
      outcomeRollup,
      topSignals,
      limitations,
    };
  }

  private async getAccessibleOrganizations(principal: CurrentPrincipal) {
    const canReadPortfolio = principal.permissions.some((permission) =>
      ['organization.read', 'organization.manage'].includes(permission),
    );

    if (!canReadPortfolio) {
      const organization = await this.prismaService.organization.findFirst({
        where: {
          id: principal.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return organization ? [organization] : [];
    }

    return this.prismaService.organization.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 25,
    });
  }

  private async buildOrganizationAggregate(
    principal: CurrentPrincipal,
    organizationId: string,
    organizationName: string,
    forceRefresh: boolean,
  ): Promise<OrganizationAggregate> {
    const scopedPrincipal: CurrentPrincipal = {
      ...principal,
      organizationId,
    };

    const [executive, outcomes, criticalSignalCount, pendingProposalCount, pendingApprovalCount, failedExecutionCount] =
      await Promise.all([
        this.aiExecutiveCopilotService.getExecutiveCopilotPayload(
          scopedPrincipal,
          organizationId,
          forceRefresh,
        ),
        this.aiOutcomeAnalyticsService.getOutcomeAnalyticsPayload(
          scopedPrincipal,
          organizationId,
          30,
        ),
        this.prismaService.aiSignal.count({
          where: {
            organizationId,
            isActive: true,
            severity: { in: ['critical', 'high'] },
          },
        }),
        this.prismaService.actionProposal.count({
          where: {
            organizationId,
            status: { in: ['PENDING', 'IN_REVIEW', 'NEEDS_REVISION', 'DEFERRED'] },
          },
        }),
        this.prismaService.actionExecution.count({
          where: {
            organizationId,
            status: 'PENDING_APPROVAL',
          },
        }),
        this.prismaService.actionExecution.count({
          where: {
            organizationId,
            status: 'FAILED',
          },
        }),
      ]);

    const topSignal = this.mapTopSignal(organizationId, organizationName, executive);
    const item: OrganizationPortfolioItem = {
      organizationId,
      organizationName,
      overallStatus: executive.trust.overallStatus as PortfolioStatus,
      trustStatus: executive.trust.overallStatus as PortfolioStatus,
      topSummary: executive.topSummary.summary,
      topSignal,
      topRecommendation: executive.keyRecommendations[0]
        ? {
            id: executive.keyRecommendations[0].id,
            title: executive.keyRecommendations[0].title,
            summary: executive.keyRecommendations[0].summary,
          }
        : null,
      pendingActionCount: pendingProposalCount + pendingApprovalCount + failedExecutionCount,
      criticalSignalCount,
      recentOutcomeTrend: outcomes.learningTrend.status as PortfolioOutcomeTrend,
      connectedStoreSummary: executive.connectedStoreStatus.summary,
      updatedAt: this.latestTimestamp([
        executive.generatedAt,
        executive.trust.updatedAt,
        outcomes.generatedAt,
        executive.connectedStoreStatus.primaryStore?.updatedAt ?? null,
      ]),
    };

    return {
      item,
      topSignal,
      pendingProposalCount,
      pendingApprovalCount,
      failedExecutionCount,
      score: this.rankOrganization(item, {
        pendingProposalCount,
        pendingApprovalCount,
        failedExecutionCount,
      }),
      limitations: executive.trust.limitations,
    };
  }

  private applyFilters(aggregates: OrganizationAggregate[], query: QueryPortfolioExecutiveDto) {
    return aggregates.filter((aggregate) => {
      const effectiveStatus = query.status ?? query.trustState;

      if (effectiveStatus && aggregate.item.overallStatus !== effectiveStatus) {
        return false;
      }

      if (query.attentionOnly) {
        return (
          aggregate.item.overallStatus !== 'healthy' ||
          aggregate.item.pendingActionCount > 0 ||
          aggregate.item.criticalSignalCount > 0 ||
          aggregate.item.recentOutcomeTrend === 'weakening'
        );
      }

      return true;
    });
  }

  private mapTopSignal(
    organizationId: string,
    organizationName: string,
    executive: ExecutiveCopilotResponse,
  ): PortfolioSignalItem | null {
    const signal = executive.keySignals[0];

    if (!signal) {
      return null;
    }

    return {
      organizationId,
      organizationName,
      signalId: signal.id,
      title: signal.title,
      summary: signal.summary,
      severity: signal.severity,
      freshnessStatus: signal.freshnessStatus,
    };
  }

  private buildTrustRollup(aggregates: OrganizationAggregate[]) {
    return {
      healthy: aggregates.filter((aggregate) => aggregate.item.overallStatus === 'healthy').length,
      limited: aggregates.filter((aggregate) => aggregate.item.overallStatus === 'limited').length,
      issueDetected: aggregates.filter((aggregate) => aggregate.item.overallStatus === 'issue_detected')
        .length,
      notConnected: aggregates.filter((aggregate) => aggregate.item.overallStatus === 'not_connected')
        .length,
    };
  }

  private buildActionRollup(aggregates: OrganizationAggregate[]) {
    return {
      totalPendingProposals: aggregates.reduce(
        (sum, aggregate) => sum + aggregate.pendingProposalCount,
        0,
      ),
      totalPendingApprovals: aggregates.reduce(
        (sum, aggregate) => sum + aggregate.pendingApprovalCount,
        0,
      ),
      failedExecutionsNeedingAttention: aggregates.reduce(
        (sum, aggregate) => sum + aggregate.failedExecutionCount,
        0,
      ),
    };
  }

  private buildOutcomeRollup(aggregates: OrganizationAggregate[]) {
    return {
      improving: aggregates.filter((aggregate) => aggregate.item.recentOutcomeTrend === 'improving')
        .length,
      stable: aggregates.filter((aggregate) => aggregate.item.recentOutcomeTrend === 'stable').length,
      weakening: aggregates.filter((aggregate) => aggregate.item.recentOutcomeTrend === 'weakening')
        .length,
      insufficientData: aggregates.filter(
        (aggregate) => aggregate.item.recentOutcomeTrend === 'insufficient_data',
      ).length,
    };
  }

  private buildLimitations(aggregates: OrganizationAggregate[], totalOrganizations: number) {
    const limitations = new Set<string>();

    for (const aggregate of aggregates) {
      for (const limitation of aggregate.limitations) {
        limitations.add(limitation);
      }
    }

    const items = Array.from(limitations).slice(0, 5);

    if (totalOrganizations === 0) {
      items.unshift('Portfolio insights will become available once stores are connected.');
    }

    return items;
  }

  private buildFocusList(aggregates: OrganizationAggregate[]): PortfolioFocusItem[] {
    return aggregates
      .filter(
        (aggregate) =>
          aggregate.item.overallStatus !== 'healthy' ||
          aggregate.item.pendingActionCount > 0 ||
          aggregate.item.criticalSignalCount > 0 ||
          aggregate.item.recentOutcomeTrend === 'weakening',
      )
      .slice(0, 5)
      .map((aggregate) => ({
        organizationId: aggregate.item.organizationId,
        organizationName: aggregate.item.organizationName,
        title:
          aggregate.item.topSignal?.title ??
          aggregate.item.topRecommendation?.title ??
          'Review executive status',
        reason:
          aggregate.item.topSignal?.summary ??
          aggregate.item.topRecommendation?.summary ??
          aggregate.item.topSummary,
        href: '/shopify/executive-brief',
        priority:
          aggregate.item.overallStatus === 'issue_detected' ||
          aggregate.failedExecutionCount > 0 ||
          aggregate.item.criticalSignalCount > 0
            ? 'high'
            : 'medium',
      }));
  }

  private buildPortfolioSummary(input: {
    organizationCount: number;
    trustRollup: PortfolioExecutiveResponse['trustRollup'];
    actionRollup: PortfolioExecutiveResponse['actionRollup'];
    outcomeRollup: PortfolioExecutiveResponse['outcomeRollup'];
    limitations: string[];
  }) {
    if (input.organizationCount === 0) {
      return 'Portfolio insights will become available once stores are connected.';
    }

    if (input.organizationCount === 1) {
      return 'Only one accessible organization is currently in scope, so this portfolio view is showing a single business unit.';
    }

    const parts: string[] = [];
    const attentionCount =
      input.trustRollup.limited + input.trustRollup.issueDetected + input.trustRollup.notConnected;

    if (attentionCount > 0) {
      parts.push(
        `${attentionCount} organization${attentionCount === 1 ? '' : 's'} require${attentionCount === 1 ? 's' : ''} attention due to trust, connectivity, or action backlog.`,
      );
    } else {
      parts.push('Most organizations are operationally stable across the current portfolio view.');
    }

    if (input.actionRollup.totalPendingApprovals > 0) {
      parts.push(
        `${input.actionRollup.totalPendingApprovals} action${input.actionRollup.totalPendingApprovals === 1 ? '' : 's'} are waiting for approval.`,
      );
    } else if (input.actionRollup.failedExecutionsNeedingAttention > 0) {
      parts.push(
        `${input.actionRollup.failedExecutionsNeedingAttention} execution${input.actionRollup.failedExecutionsNeedingAttention === 1 ? '' : 's'} failed and need follow-up.`,
      );
    }

    if (input.outcomeRollup.improving > input.outcomeRollup.weakening) {
      parts.push('Outcome quality is improving in more organizations than it is weakening.');
    } else if (input.outcomeRollup.weakening > 0) {
      parts.push('Outcome trends are weakening in part of the portfolio and should be reviewed closely.');
    }

    if (input.limitations.length > 0) {
      parts.push(input.limitations[0]);
    }

    return parts.slice(0, 3).join(' ');
  }

  private rankOrganization(
    item: OrganizationPortfolioItem,
    counts: {
      pendingProposalCount: number;
      pendingApprovalCount: number;
      failedExecutionCount: number;
    },
  ) {
    let score = 0;

    switch (item.overallStatus) {
      case 'issue_detected':
        score += 400;
        break;
      case 'not_connected':
        score += 320;
        break;
      case 'limited':
        score += 240;
        break;
      case 'healthy':
      default:
        score += 100;
        break;
    }

    score += item.criticalSignalCount * 45;
    score += counts.pendingProposalCount * 12;
    score += counts.pendingApprovalCount * 18;
    score += counts.failedExecutionCount * 25;

    if (item.recentOutcomeTrend === 'weakening') {
      score += 50;
    } else if (item.recentOutcomeTrend === 'improving') {
      score -= 15;
    } else if (item.recentOutcomeTrend === 'insufficient_data') {
      score -= 5;
    }

    return score;
  }

  private signalPriority(signal: PortfolioSignalItem) {
    const severityScore =
      signal.severity === 'critical'
        ? 400
        : signal.severity === 'high'
          ? 300
          : signal.severity === 'medium'
            ? 200
            : 100;
    const freshnessScore = signal.freshnessStatus === 'fresh' ? 20 : signal.freshnessStatus === 'delayed' ? 10 : 0;

    return severityScore + freshnessScore;
  }

  private latestTimestamp(values: Array<string | null | undefined>) {
    return values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? new Date().toISOString();
  }
}
