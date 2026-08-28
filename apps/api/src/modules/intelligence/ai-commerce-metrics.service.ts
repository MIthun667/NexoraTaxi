import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';

type TimeWindowMetrics = {
  revenue: number;
  orders: number;
  newCustomers: number;
  repeatCustomers: number;
};

export type CommerceOverviewMetrics = {
  organizationId: string;
  generatedAt: string;
  current24h: TimeWindowMetrics;
  previous24h: TimeWindowMetrics;
  totalRevenueToday: number;
  totalOrdersToday: number;
  totalNewCustomersToday: number;
  activeSignalsCount: number;
  lastCustomerSeenAt: string | null;
  refundTelemetryAvailable: boolean;
  stripeConnected: boolean;
  stripeRevenueToday: number;
  stripeCurrent24hRevenue: number;
  stripePrevious24hRevenue: number;
  stripeFailedPaymentsCurrent24h: number;
  stripeFailedPaymentsPrevious24h: number;
  stripeRefundsCurrent24h: number;
  stripeDisputesCurrent24h: number;
  stripeSuccessfulChargesCurrent24h: number;
  stripeSuccessfulChargesPrevious24h: number;
  shopifyDataCoverage: 'FULL' | 'PARTIAL' | 'NONE';
  shopifyLimitedAccess: boolean;
  protectedCustomerDataRequired: boolean;
  topProduct:
    | {
        productId: string | null;
        title: string;
        revenue: number;
        unitsSold: number;
      }
    | null;
  topProductRevenueShare30d: number | null;
  changes: {
    revenueChangeRatio: number | null;
    orderChangeRatio: number | null;
    newCustomerChangeRatio: number | null;
    repeatCustomerChangeRatio: number | null;
  };
};

type ProductRollup = {
  productId: string | null;
  title: string;
  revenue: number;
  unitsSold: number;
};

@Injectable()
export class AiCommerceMetricsService {
  constructor(private readonly prismaService: PrismaService) {}

  async resolveOrganizationScope(principal: CurrentPrincipal, organizationId?: string) {
    const scopedOrganizationId = organizationId ?? principal.organizationId;

    if (principal.organizationId !== scopedOrganizationId) {
      throw new NotFoundException('Organization context could not be resolved.');
    }

    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: scopedOrganizationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization context could not be resolved.');
    }

    return organization.id;
  }

  async getCommerceOverviewMetrics(organizationId: string): Promise<CommerceOverviewMetrics> {
    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousWindowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const startOfToday = this.startOfDay(now);
    const topProductWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      currentOrders,
      previousOrders,
      currentCustomers,
      previousCustomers,
      todayRevenueAggregate,
      todayOrdersCount,
      todayCustomersCount,
      activeSignalsCount,
      latestCustomer,
      recentOrdersForProducts,
      activeStripeAccount,
      stripeRevenueTodayAggregate,
      stripeRevenueCurrentAggregate,
      stripeRevenuePreviousAggregate,
      stripeFailedPaymentsCurrentCount,
      stripeFailedPaymentsPreviousCount,
      stripeRefundsCurrentCount,
      stripeDisputesCurrentCount,
      stripeSuccessfulChargesCurrentCount,
      stripeSuccessfulChargesPreviousCount,
      latestShopifySyncRun,
    ] = await Promise.all([
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: currentWindowStart, lt: now },
        },
        select: {
          customerExternalId: true,
          totalPrice: true,
        },
      }),
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: previousWindowStart, lt: currentWindowStart },
        },
        select: {
          customerExternalId: true,
          totalPrice: true,
        },
      }),
      this.prismaService.shopifyCustomer.findMany({
        where: {
          organizationId,
          createdAt: { gte: currentWindowStart, lt: now },
        },
        select: {
          externalCustomerId: true,
        },
      }),
      this.prismaService.shopifyCustomer.findMany({
        where: {
          organizationId,
          createdAt: { gte: previousWindowStart, lt: currentWindowStart },
        },
        select: {
          externalCustomerId: true,
        },
      }),
      this.prismaService.shopifyOrder.aggregate({
        where: {
          organizationId,
          placedAt: { gte: startOfToday, lte: now },
        },
        _sum: {
          totalPrice: true,
        },
      }),
      this.prismaService.shopifyOrder.count({
        where: {
          organizationId,
          placedAt: { gte: startOfToday, lte: now },
        },
      }),
      this.prismaService.shopifyCustomer.count({
        where: {
          organizationId,
          createdAt: { gte: startOfToday, lte: now },
        },
      }),
      this.prismaService.aiSignal.count({
        where: {
          organizationId,
          isActive: true,
        },
      }),
      this.prismaService.shopifyCustomer.findFirst({
        where: { organizationId },
        orderBy: [{ createdAt: 'desc' }],
        select: { createdAt: true },
      }),
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: topProductWindowStart, lte: now },
        },
        select: {
          rawPayload: true,
        },
      }),
      this.prismaService.integrationStripeAccount.findFirst({
        where: {
          organizationId,
          isActive: true,
        },
        select: { id: true },
      }),
      this.prismaService.stripeCharge.aggregate({
        where: {
          organizationId,
          paid: true,
          refunded: false,
          createdAtRemote: { gte: startOfToday, lte: now },
        },
        _sum: { amount: true },
      }),
      this.prismaService.stripeCharge.aggregate({
        where: {
          organizationId,
          paid: true,
          refunded: false,
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
        _sum: { amount: true },
      }),
      this.prismaService.stripeCharge.aggregate({
        where: {
          organizationId,
          paid: true,
          refunded: false,
          createdAtRemote: { gte: previousWindowStart, lt: currentWindowStart },
        },
        _sum: { amount: true },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId,
          status: 'failed',
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId,
          status: 'failed',
          createdAtRemote: { gte: previousWindowStart, lt: currentWindowStart },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId,
          refunded: true,
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId,
          disputed: true,
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId,
          status: 'succeeded',
          paid: true,
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId,
          status: 'succeeded',
          paid: true,
          createdAtRemote: { gte: previousWindowStart, lt: currentWindowStart },
        },
      }),
      this.prismaService.shopifySyncRun.findFirst({
        where: { organizationId },
        orderBy: { startedAt: 'desc' },
        select: {
          status: true,
          metadata: true,
        },
      }),
    ]);

    const [currentRepeatCustomers, previousRepeatCustomers] = await Promise.all([
      this.countRepeatCustomers(organizationId, currentOrders),
      this.countRepeatCustomers(organizationId, previousOrders),
    ]);

    const topProduct = this.extractTopProduct(recentOrdersForProducts);
    const recentProductRevenueTotal = recentOrdersForProducts.reduce((sum, order) => {
      const payload =
        order.rawPayload && typeof order.rawPayload === 'object' && !Array.isArray(order.rawPayload)
          ? (order.rawPayload as Record<string, unknown>)
          : null;
      const lineItems = Array.isArray(payload?.line_items)
        ? (payload.line_items as Array<Record<string, unknown>>)
        : [];

      return (
        sum +
        lineItems.reduce((lineItemSum, lineItem) => {
          const totalPrice =
            (this.toNumber(lineItem.price) ?? 0) * (this.toNumber(lineItem.quantity) ?? 1);
          return lineItemSum + totalPrice;
        }, 0)
      );
    }, 0);
    const latestSyncMetadata = this.asRecord(latestShopifySyncRun?.metadata);
    const protectedCustomerDataRequired = Boolean(latestSyncMetadata?.protectedCustomerDataRequired);
    const shopifyDataCoverage =
      latestShopifySyncRun?.status === 'SUCCEEDED'
        ? ('FULL' as const)
        : latestShopifySyncRun?.status === 'PARTIAL_SUCCESS'
          ? ('PARTIAL' as const)
          : ('NONE' as const);

    return {
      organizationId,
      generatedAt: now.toISOString(),
      current24h: {
        revenue: this.sumRevenue(currentOrders),
        orders: currentOrders.length,
        newCustomers: currentCustomers.length,
        repeatCustomers: currentRepeatCustomers,
      },
      previous24h: {
        revenue: this.sumRevenue(previousOrders),
        orders: previousOrders.length,
        newCustomers: previousCustomers.length,
        repeatCustomers: previousRepeatCustomers,
      },
      totalRevenueToday: Number(todayRevenueAggregate._sum.totalPrice ?? 0),
      totalOrdersToday: todayOrdersCount,
      totalNewCustomersToday: todayCustomersCount,
      activeSignalsCount,
      lastCustomerSeenAt: latestCustomer?.createdAt.toISOString() ?? null,
      refundTelemetryAvailable: stripeRefundsCurrentCount > 0 || Boolean(activeStripeAccount),
      stripeConnected: Boolean(activeStripeAccount),
      stripeRevenueToday: Number(stripeRevenueTodayAggregate._sum.amount ?? 0),
      stripeCurrent24hRevenue: Number(stripeRevenueCurrentAggregate._sum.amount ?? 0),
      stripePrevious24hRevenue: Number(stripeRevenuePreviousAggregate._sum.amount ?? 0),
      stripeFailedPaymentsCurrent24h: stripeFailedPaymentsCurrentCount,
      stripeFailedPaymentsPrevious24h: stripeFailedPaymentsPreviousCount,
      stripeRefundsCurrent24h: stripeRefundsCurrentCount,
      stripeDisputesCurrent24h: stripeDisputesCurrentCount,
      stripeSuccessfulChargesCurrent24h: stripeSuccessfulChargesCurrentCount,
      stripeSuccessfulChargesPrevious24h: stripeSuccessfulChargesPreviousCount,
      shopifyDataCoverage,
      shopifyLimitedAccess: protectedCustomerDataRequired || shopifyDataCoverage === 'PARTIAL',
      protectedCustomerDataRequired,
      topProduct,
      topProductRevenueShare30d:
        topProduct && recentProductRevenueTotal > 0 ? topProduct.revenue / recentProductRevenueTotal : null,
      changes: {
        revenueChangeRatio: this.safeChangeRatio(
          this.sumRevenue(currentOrders),
          this.sumRevenue(previousOrders),
        ),
        orderChangeRatio: this.safeChangeRatio(currentOrders.length, previousOrders.length),
        newCustomerChangeRatio: this.safeChangeRatio(
          currentCustomers.length,
          previousCustomers.length,
        ),
        repeatCustomerChangeRatio: this.safeChangeRatio(
          currentRepeatCustomers,
          previousRepeatCustomers,
        ),
      },
    };
  }

  private sumRevenue(orders: Array<{ totalPrice: Prisma.Decimal | null }>) {
    return orders.reduce((total, order) => total + Number(order.totalPrice ?? 0), 0);
  }

  private safeChangeRatio(current: number, previous: number) {
    if (previous <= 0) {
      return current > 0 ? 1 : null;
    }

    return (current - previous) / previous;
  }

  private async countRepeatCustomers(
    organizationId: string,
    orders: Array<{ customerExternalId: string | null; totalPrice: Prisma.Decimal | null }>,
  ) {
    const externalIds = [...new Set(orders.map((order) => order.customerExternalId).filter(Boolean))] as string[];

    if (!externalIds.length) {
      return 0;
    }

    const repeatCustomers = await this.prismaService.shopifyCustomer.count({
      where: {
        organizationId,
        externalCustomerId: { in: externalIds },
        ordersCount: { gt: 1 },
      },
    });

    return repeatCustomers;
  }

  private extractTopProduct(
    orders: Array<{
      rawPayload: Prisma.JsonValue | null;
    }>,
  ): ProductRollup | null {
    const rollups = new Map<string, ProductRollup>();

    for (const order of orders) {
      if (!order.rawPayload || typeof order.rawPayload !== 'object' || Array.isArray(order.rawPayload)) {
        continue;
      }

      const lineItems = (order.rawPayload as { line_items?: unknown }).line_items;
      if (!Array.isArray(lineItems)) {
        continue;
      }

      for (const item of lineItems) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          continue;
        }

        const lineItem = item as Record<string, unknown>;
        const title = typeof lineItem.title === 'string' ? lineItem.title : null;
        if (!title) {
          continue;
        }

        const productId =
          lineItem.product_id === null || lineItem.product_id === undefined
            ? null
            : String(lineItem.product_id);
        const quantity = this.toNumber(lineItem.quantity) ?? 0;
        const unitPrice = this.toNumber(lineItem.price) ?? 0;
        const key = `${productId ?? 'unknown'}::${title}`;
        const existing = rollups.get(key) ?? {
          productId,
          title,
          revenue: 0,
          unitsSold: 0,
        };

        existing.unitsSold += quantity;
        existing.revenue += quantity * unitPrice;
        rollups.set(key, existing);
      }
    }

    const topProduct = [...rollups.values()].sort((left, right) => right.revenue - left.revenue)[0];
    return topProduct ?? null;
  }

  private toNumber(value: unknown) {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private asRecord(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
