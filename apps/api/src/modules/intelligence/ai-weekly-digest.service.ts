import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { GenerateAiWeeklyDigestDto } from './dto/generate-ai-weekly-digest.dto';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';
import { QueryWeeklyDigestHistoryDto } from './dto/query-weekly-digest-history.dto';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiWeeklyReportMetricsService } from './ai-weekly-report-metrics.service';

type WeeklyWindow = {
  start: Date;
  end: Date;
};

@Injectable()
export class AiWeeklyDigestService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly aiWeeklyReportMetricsService: AiWeeklyReportMetricsService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getCurrentWeeklyDigest(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const digest = await this.ensureWeeklyDigest(organizationId, false);

    return buildSuccessResponse('AI weekly digest retrieved successfully.', digest);
  }

  async generateWeeklyDigest(principal: CurrentPrincipal, dto: GenerateAiWeeklyDigestDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      dto.organizationId,
    );
    const digest = await this.ensureWeeklyDigest(organizationId, true);

    return buildSuccessResponse('AI weekly digest generated successfully.', digest);
  }

  async getWeeklyDigestHistory(principal: CurrentPrincipal, query: QueryWeeklyDigestHistoryDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const digests = await this.prismaService.aiWeeklyDigest.findMany({
      where: { organizationId },
      orderBy: [{ weekStartDate: 'desc' }],
      take: query.limit ?? 8,
    });

    return buildSuccessResponse('AI weekly digest history retrieved successfully.', digests);
  }

  private async ensureWeeklyDigest(organizationId: string, forceRefresh: boolean) {
    const currentWeek = this.getWeekWindow(new Date());

    if (!forceRefresh) {
      const existing = await this.prismaService.aiWeeklyDigest.findUnique({
        where: {
          organizationId_weekStartDate_weekEndDate: {
            organizationId,
            weekStartDate: currentWeek.start,
            weekEndDate: currentWeek.end,
          },
        },
      });

      if (existing) {
        return existing;
      }
    }

    const previousWeek = this.getPreviousWeekWindow(currentWeek.start);
    const metrics = await this.aiWeeklyReportMetricsService.getWeeklyMetrics(
      organizationId,
      currentWeek,
      previousWeek,
    );

    const digest = this.buildDeterministicDigest(metrics);

    const record = await this.prismaService.aiWeeklyDigest.upsert({
      where: {
        organizationId_weekStartDate_weekEndDate: {
          organizationId,
          weekStartDate: currentWeek.start,
          weekEndDate: currentWeek.end,
        },
      },
      update: {
        summary: digest.summary,
        highlights: digest.highlights as Prisma.InputJsonValue,
        risks: digest.risks as Prisma.InputJsonValue,
        recommendations: digest.recommendations as Prisma.InputJsonValue,
        metrics: digest.metrics as Prisma.InputJsonValue,
        sourceType: 'deterministic',
        modelName: null,
        status: 'SUCCEEDED',
        metadata: {
          generatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
      create: {
        organizationId,
        weekStartDate: currentWeek.start,
        weekEndDate: currentWeek.end,
        summary: digest.summary,
        highlights: digest.highlights as Prisma.InputJsonValue,
        risks: digest.risks as Prisma.InputJsonValue,
        recommendations: digest.recommendations as Prisma.InputJsonValue,
        metrics: digest.metrics as Prisma.InputJsonValue,
        sourceType: 'deterministic',
        modelName: null,
        status: 'SUCCEEDED',
        metadata: {
          generatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.debug({
      event: 'ai.weekly_digest.generated',
      organizationId,
      weekStartDate: currentWeek.start.toISOString(),
      weekEndDate: currentWeek.end.toISOString(),
      sourceType: 'deterministic',
    });

    return record;
  }

  private buildDeterministicDigest(
    metrics: Awaited<ReturnType<AiWeeklyReportMetricsService['getWeeklyMetrics']>>,
  ) {
    const revenueDelta = this.calculateChangeRatio(
      metrics.commerce.revenueCurrent,
      metrics.commerce.revenuePrevious,
    );
    const orderDelta = this.calculateChangeRatio(
      metrics.commerce.ordersCurrent,
      metrics.commerce.ordersPrevious,
    );
    const customerDelta = this.calculateChangeRatio(
      metrics.commerce.newCustomersCurrent,
      metrics.commerce.newCustomersPrevious,
    );

    const highlights: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];

    highlights.push(
      `${metrics.commerce.ordersCurrent} Shopify orders generated ${this.formatCurrency(metrics.commerce.revenueCurrent)} this week.`,
    );

    if (metrics.finance.revenueCurrent > 0) {
      highlights.push(
        `Stripe confirmed ${this.formatCurrency(metrics.finance.revenueCurrent)} in successful payment revenue this week.`,
      );
    }

    if (metrics.commerce.topProductCurrent) {
      highlights.push(
        `${metrics.commerce.topProductCurrent.title} led weekly product performance with ${this.formatCurrency(metrics.commerce.topProductCurrent.revenue)} in sales.`,
      );
    }

    if (metrics.governance.reviewsCompleted > 0) {
      highlights.push(
        `${metrics.governance.reviewsCompleted} proposal review${metrics.governance.reviewsCompleted === 1 ? '' : 's'} were completed this week.`,
      );
    }

    if (revenueDelta < -0.1) {
      risks.push(
        `Weekly Shopify revenue declined ${this.formatPercent(Math.abs(revenueDelta))} versus the previous week.`,
      );
      recommendations.push('Review demand and payment conversion drivers from the week-over-week revenue decline.');
    }

    if (metrics.finance.failedPaymentsCurrent > metrics.finance.failedPaymentsPrevious) {
      risks.push(
        `Failed payments increased to ${metrics.finance.failedPaymentsCurrent} this week.`,
      );
      recommendations.push('Inspect failed payment patterns in Stripe and prioritize checkout/payment remediation.');
    }

    if (metrics.finance.refundsCurrent > 0 || metrics.finance.disputesCurrent > 0) {
      risks.push(
        `${metrics.finance.refundsCurrent} refund${metrics.finance.refundsCurrent === 1 ? '' : 's'} and ${metrics.finance.disputesCurrent} dispute${metrics.finance.disputesCurrent === 1 ? '' : 's'} were detected in Stripe this week.`,
      );
    }

    if (metrics.customer.atRiskCustomers > 0 || metrics.customer.dormantCustomers > 0) {
      risks.push(
        `${metrics.customer.atRiskCustomers} customers are at risk and ${metrics.customer.dormantCustomers} are currently dormant.`,
      );
      recommendations.push('Prioritize retention review for high-value and at-risk customer segments.');
    }

    if (metrics.governance.proposalsPending > 0) {
      risks.push(
        `${metrics.governance.proposalsPending} action proposal${metrics.governance.proposalsPending === 1 ? '' : 's'} remain pending review.`,
      );
      recommendations.push('Clear proposal backlog so governance does not delay execution on important actions.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current operating cadence and continue weekly monitoring across commerce, payments, and customer health.');
    }

    const summary = `This week, Shopify demand produced ${this.formatCurrency(metrics.commerce.revenueCurrent)} across ${metrics.commerce.ordersCurrent} orders, while Stripe confirmed ${this.formatCurrency(metrics.finance.revenueCurrent)} in payment revenue. New customer acquisition ${customerDelta >= 0 ? 'improved' : 'softened'} ${this.formatPercent(Math.abs(customerDelta))} versus last week, and ${metrics.governance.proposalsCreated} proposal${metrics.governance.proposalsCreated === 1 ? '' : 's'} entered governance review. Leadership should focus on ${this.buildFocusPhrase(risks, metrics)}.`;

    return {
      summary,
      highlights,
      risks,
      recommendations,
      metrics: {
        commerce: {
          revenueCurrent: metrics.commerce.revenueCurrent,
          revenuePrevious: metrics.commerce.revenuePrevious,
          revenueDelta,
          ordersCurrent: metrics.commerce.ordersCurrent,
          ordersPrevious: metrics.commerce.ordersPrevious,
          orderDelta,
          newCustomersCurrent: metrics.commerce.newCustomersCurrent,
          newCustomersPrevious: metrics.commerce.newCustomersPrevious,
          customerDelta,
          repeatOrdersCurrent: metrics.commerce.repeatOrdersCurrent,
          repeatOrdersPrevious: metrics.commerce.repeatOrdersPrevious,
          topProductCurrent: metrics.commerce.topProductCurrent,
          topProductPrevious: metrics.commerce.topProductPrevious,
        },
        finance: metrics.finance,
        customer: metrics.customer,
        intelligence: metrics.intelligence,
        governance: metrics.governance,
      },
    };
  }

  private buildFocusPhrase(risks: string[], metrics: Awaited<ReturnType<AiWeeklyReportMetricsService['getWeeklyMetrics']>>) {
    if (risks.length > 0) {
      return risks[0].charAt(0).toLowerCase() + risks[0].slice(1);
    }

    if (metrics.commerce.topProductCurrent) {
      return `protecting momentum around ${metrics.commerce.topProductCurrent.title}`;
    }

    return 'sustaining stable weekly performance';
  }

  private getWeekWindow(value: Date): WeeklyWindow {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(date);
    start.setDate(date.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private getPreviousWeekWindow(currentWeekStart: Date): WeeklyWindow {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private calculateChangeRatio(current: number, previous: number) {
    if (!previous && !current) {
      return 0;
    }
    if (!previous) {
      return 1;
    }

    return (current - previous) / previous;
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatPercent(value: number) {
    return `${(value * 100).toFixed(0)}%`;
  }
}
