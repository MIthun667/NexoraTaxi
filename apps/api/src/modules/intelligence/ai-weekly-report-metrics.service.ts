import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

type WeeklyWindow = {
  start: Date;
  end: Date;
};

@Injectable()
export class AiWeeklyReportMetricsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getWeeklyMetrics(organizationId: string, currentWeek: WeeklyWindow, previousWeek: WeeklyWindow) {
    const [
      currentOrders,
      previousOrders,
      currentCustomers,
      previousCustomers,
      currentSignals,
      currentRecommendations,
      currentProposals,
      currentProposalReviews,
      currentStripeCharges,
      previousStripeCharges,
      topProductsCurrent,
      topProductsPrevious,
      totalProfiles,
      atRiskProfiles,
      highValueProfiles,
      dormantProfiles,
    ] = await Promise.all([
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: currentWeek.start, lte: currentWeek.end },
        },
        select: {
          totalPrice: true,
          customerExternalId: true,
          rawPayload: true,
        },
      }),
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: previousWeek.start, lte: previousWeek.end },
        },
        select: {
          totalPrice: true,
          customerExternalId: true,
          rawPayload: true,
        },
      }),
      this.prismaService.shopifyCustomer.count({
        where: {
          organizationId,
          createdAt: { gte: currentWeek.start, lte: currentWeek.end },
        },
      }),
      this.prismaService.shopifyCustomer.count({
        where: {
          organizationId,
          createdAt: { gte: previousWeek.start, lte: previousWeek.end },
        },
      }),
      this.prismaService.aiSignal.findMany({
        where: {
          organizationId,
          detectedAt: { gte: currentWeek.start, lte: currentWeek.end },
        },
        orderBy: { detectedAt: 'desc' },
      }),
      this.prismaService.aiRecommendation.findMany({
        where: {
          organizationId,
          createdAt: { gte: currentWeek.start, lte: currentWeek.end },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.actionProposal.findMany({
        where: {
          organizationId,
          createdAt: { gte: currentWeek.start, lte: currentWeek.end },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.actionProposalReview.findMany({
        where: {
          organizationId,
          createdAt: { gte: currentWeek.start, lte: currentWeek.end },
        },
      }),
      this.prismaService.stripeCharge.findMany({
        where: {
          organizationId,
          createdAtRemote: { gte: currentWeek.start, lte: currentWeek.end },
        },
        select: {
          amount: true,
          paid: true,
          status: true,
          refunded: true,
          disputed: true,
        },
      }),
      this.prismaService.stripeCharge.findMany({
        where: {
          organizationId,
          createdAtRemote: { gte: previousWeek.start, lte: previousWeek.end },
        },
        select: {
          amount: true,
          paid: true,
          status: true,
          refunded: true,
          disputed: true,
        },
      }),
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: currentWeek.start, lte: currentWeek.end },
        },
        select: {
          rawPayload: true,
        },
      }),
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: previousWeek.start, lte: previousWeek.end },
        },
        select: {
          rawPayload: true,
        },
      }),
      this.prismaService.crmCustomerProfile.count({ where: { organizationId } }),
      this.prismaService.crmCustomerProfile.count({ where: { organizationId, isAtRisk: true } }),
      this.prismaService.crmCustomerProfile.count({ where: { organizationId, isHighValue: true } }),
      this.prismaService.crmCustomerProfile.count({
        where: { organizationId, lifecycleStage: 'DORMANT' },
      }),
    ]);

    const currentRevenue = this.sumDecimalValues(currentOrders.map((order) => order.totalPrice));
    const previousRevenue = this.sumDecimalValues(previousOrders.map((order) => order.totalPrice));

    const currentRepeatOrders = currentOrders.filter((order) => Boolean(order.customerExternalId)).length;
    const previousRepeatOrders = previousOrders.filter((order) => Boolean(order.customerExternalId)).length;

    const stripeRevenueCurrent = this.sumDecimalValues(
      currentStripeCharges
        .filter((charge) => charge.paid)
        .map((charge) => charge.amount),
    );
    const stripeRevenuePrevious = this.sumDecimalValues(
      previousStripeCharges
        .filter((charge) => charge.paid)
        .map((charge) => charge.amount),
    );

    const topProductCurrent = this.extractTopProduct(topProductsCurrent);
    const topProductPrevious = this.extractTopProduct(topProductsPrevious);

    return {
      commerce: {
        revenueCurrent: currentRevenue,
        revenuePrevious: previousRevenue,
        ordersCurrent: currentOrders.length,
        ordersPrevious: previousOrders.length,
        newCustomersCurrent: currentCustomers,
        newCustomersPrevious: previousCustomers,
        repeatOrdersCurrent: currentRepeatOrders,
        repeatOrdersPrevious: previousRepeatOrders,
        topProductCurrent,
        topProductPrevious,
      },
      finance: {
        revenueCurrent: stripeRevenueCurrent,
        revenuePrevious: stripeRevenuePrevious,
        failedPaymentsCurrent: currentStripeCharges.filter((charge) => charge.paid === false || charge.status === 'failed').length,
        failedPaymentsPrevious: previousStripeCharges.filter((charge) => charge.paid === false || charge.status === 'failed').length,
        refundsCurrent: currentStripeCharges.filter((charge) => charge.refunded).length,
        disputesCurrent: currentStripeCharges.filter((charge) => charge.disputed).length,
      },
      customer: {
        totalProfiles,
        highValueCustomers: highValueProfiles,
        atRiskCustomers: atRiskProfiles,
        dormantCustomers: dormantProfiles,
      },
      intelligence: {
        signalCount: currentSignals.length,
        highSeveritySignals: currentSignals.filter(
          (signal) => signal.severity === 'high' || signal.severity === 'critical',
        ).length,
        recommendationCount: currentRecommendations.length,
        criticalRecommendations: currentRecommendations.filter(
          (recommendation) => recommendation.priority === 'CRITICAL',
        ).length,
        activeRisks: currentSignals
          .filter((signal) =>
            ['critical', 'high', 'medium'].includes(signal.severity),
          )
          .map((signal) => signal.title)
          .slice(0, 5),
      },
      governance: {
        proposalsCreated: currentProposals.length,
        proposalsApproved: currentProposals.filter((proposal) => proposal.status === 'APPROVED').length,
        proposalsRejected: currentProposals.filter((proposal) => proposal.status === 'REJECTED').length,
        proposalsNeedsRevision: currentProposals.filter((proposal) => proposal.status === 'NEEDS_REVISION').length,
        proposalsPending: currentProposals.filter(
          (proposal) => proposal.status === 'PENDING' || proposal.status === 'IN_REVIEW',
        ).length,
        reviewsCompleted: currentProposalReviews.length,
      },
      sourceCollections: {
        signals: currentSignals,
        recommendations: currentRecommendations,
        proposals: currentProposals,
      },
    };
  }

  private sumDecimalValues(values: Array<Prisma.Decimal | null | undefined>) {
    return values.reduce((sum, value) => sum + Number(value ?? 0), 0);
  }

  private extractTopProduct(
    orders: Array<{ rawPayload: Prisma.JsonValue | null }>,
  ): { title: string; revenue: number; unitsSold: number } | null {
    const productRevenue = new Map<string, { title: string; revenue: number; unitsSold: number }>();

    for (const order of orders) {
      const payload =
        order.rawPayload && typeof order.rawPayload === 'object' && !Array.isArray(order.rawPayload)
          ? (order.rawPayload as Record<string, unknown>)
          : null;
      const lineItems = Array.isArray(payload?.line_items)
        ? (payload?.line_items as Array<Record<string, unknown>>)
        : [];

      for (const item of lineItems) {
        const title = typeof item.title === 'string' ? item.title : 'Untitled product';
        const quantity = Number(item.quantity ?? 0);
        const price = Number(item.price ?? 0);
        const revenue = Number.isFinite(price * quantity) ? price * quantity : 0;
        const existing = productRevenue.get(title) ?? { title, revenue: 0, unitsSold: 0 };
        existing.revenue += revenue;
        existing.unitsSold += quantity;
        productRevenue.set(title, existing);
      }
    }

    const topProduct = Array.from(productRevenue.values()).sort((left, right) => right.revenue - left.revenue)[0];
    return topProduct ?? null;
  }
}
