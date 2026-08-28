import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { QueryCrmCustomersDto } from './dto/query-crm-customers.dto';
import { CrmCustomerProfileService } from './crm-customer-profile.service';

export type CustomerHealthMetrics = {
  totalCustomers: number;
  highValueCustomers: number;
  atRiskCustomers: number;
  dormantCustomers: number;
  repeatCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  highValueAtRiskCustomers: number;
  topCustomerRevenueShare: number;
  repeatCustomerShareCurrent: number | null;
  repeatCustomerSharePrevious: number | null;
  retentionPressure: 'LOW' | 'MEDIUM' | 'HIGH';
  topHighValueCustomers: Array<{
    id: string;
    externalCustomerId: string;
    name: string;
    totalRevenue: number;
    lastOrderAt: string | null;
    lifecycleStage: string | null;
  }>;
  topAtRiskCustomers: Array<{
    id: string;
    externalCustomerId: string;
    name: string;
    totalRevenue: number;
    lastOrderAt: string | null;
    lifecycleStage: string | null;
  }>;
};

@Injectable()
export class CrmCustomerIntelligenceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly crmCustomerProfileService: CrmCustomerProfileService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getSegments(principal: CurrentPrincipal, query: QueryCrmCustomersDto) {
    const organizationId = await this.crmCustomerProfileService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );
    const metrics = await this.getCustomerHealthMetrics(organizationId);
    await this.persistSegmentSnapshots(organizationId, metrics);

    return buildSuccessResponse('CRM customer segments retrieved successfully.', {
      generatedAt: new Date().toISOString(),
      summary: {
        totalCustomers: metrics.totalCustomers,
        highValueCustomers: metrics.highValueCustomers,
        atRiskCustomers: metrics.atRiskCustomers,
        dormantCustomers: metrics.dormantCustomers,
        repeatCustomers: metrics.repeatCustomers,
        activeCustomers: metrics.activeCustomers,
        newCustomers: metrics.newCustomers,
        highValueAtRiskCustomers: metrics.highValueAtRiskCustomers,
        topCustomerRevenueShare: metrics.topCustomerRevenueShare,
        repeatCustomerShareCurrent: metrics.repeatCustomerShareCurrent,
        repeatCustomerSharePrevious: metrics.repeatCustomerSharePrevious,
        retentionPressure: metrics.retentionPressure,
      },
      topHighValueCustomers: metrics.topHighValueCustomers,
      topAtRiskCustomers: metrics.topAtRiskCustomers,
    });
  }

  async getCustomerHealthMetrics(organizationId: string): Promise<CustomerHealthMetrics> {
    await this.crmCustomerProfileService.ensureProfilesFresh(organizationId);
    const profiles = await this.prismaService.crmCustomerProfile.findMany({
      where: { organizationId },
      orderBy: { totalRevenue: 'desc' },
    });

    const totalCustomers = profiles.length;
    const totalRevenue = profiles.reduce(
      (sum, profile) => sum + Number(profile.totalRevenue ?? 0),
      0,
    );
    const highValueCustomers = profiles.filter((profile) => profile.isHighValue).length;
    const atRiskCustomers = profiles.filter((profile) => profile.isAtRisk).length;
    const dormantCustomers = profiles.filter((profile) => profile.lifecycleStage === 'DORMANT').length;
    const repeatCustomers = profiles.filter((profile) => profile.totalOrders >= 2).length;
    const newCustomers = profiles.filter((profile) => profile.lifecycleStage === 'NEW').length;
    const activeCustomers = profiles.filter((profile) =>
      ['ACTIVE', 'REPEAT', 'HIGH_VALUE'].includes(profile.lifecycleStage ?? ''),
    ).length;
    const highValueAtRiskCustomers = profiles.filter(
      (profile) => profile.isHighValue && profile.isAtRisk,
    ).length;
    const topFiveRevenue = profiles
      .slice(0, 5)
      .reduce((sum, profile) => sum + Number(profile.totalRevenue ?? 0), 0);
    const topCustomerRevenueShare =
      totalRevenue > 0 ? topFiveRevenue / totalRevenue : 0;

    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousWindowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const repeatCustomerIds = new Set(
      profiles
        .filter((profile) => profile.totalOrders >= 2)
        .map((profile) => profile.externalCustomerId),
    );

    const [currentOrders, previousOrders] = await Promise.all([
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: currentWindowStart, lt: now },
        },
        select: {
          customerExternalId: true,
        },
      }),
      this.prismaService.shopifyOrder.findMany({
        where: {
          organizationId,
          placedAt: { gte: previousWindowStart, lt: currentWindowStart },
        },
        select: {
          customerExternalId: true,
        },
      }),
    ]);

    const currentRepeatOrders = currentOrders.filter(
      (order) => order.customerExternalId && repeatCustomerIds.has(order.customerExternalId),
    ).length;
    const previousRepeatOrders = previousOrders.filter(
      (order) => order.customerExternalId && repeatCustomerIds.has(order.customerExternalId),
    ).length;
    const repeatCustomerShareCurrent =
      currentOrders.length > 0 ? currentRepeatOrders / currentOrders.length : null;
    const repeatCustomerSharePrevious =
      previousOrders.length > 0 ? previousRepeatOrders / previousOrders.length : null;

    const retentionPressure =
      highValueAtRiskCustomers > 0 || dormantCustomers >= Math.max(3, Math.ceil(totalCustomers * 0.2))
        ? 'HIGH'
        : atRiskCustomers >= Math.max(2, Math.ceil(totalCustomers * 0.1))
          ? 'MEDIUM'
          : 'LOW';

    return {
      totalCustomers,
      highValueCustomers,
      atRiskCustomers,
      dormantCustomers,
      repeatCustomers,
      newCustomers,
      activeCustomers,
      highValueAtRiskCustomers,
      topCustomerRevenueShare,
      repeatCustomerShareCurrent,
      repeatCustomerSharePrevious,
      retentionPressure,
      topHighValueCustomers: profiles
        .filter((profile) => profile.isHighValue)
        .slice(0, 5)
        .map((profile) => this.toCustomerPreview(profile)),
      topAtRiskCustomers: profiles
        .filter((profile) => profile.isAtRisk)
        .slice(0, 5)
        .map((profile) => this.toCustomerPreview(profile)),
    };
  }

  private async persistSegmentSnapshots(
    organizationId: string,
    metrics: CustomerHealthMetrics,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const segmentRows = [
      { segmentType: 'TOTAL', customerCount: metrics.totalCustomers },
      { segmentType: 'HIGH_VALUE', customerCount: metrics.highValueCustomers },
      { segmentType: 'AT_RISK', customerCount: metrics.atRiskCustomers },
      { segmentType: 'DORMANT', customerCount: metrics.dormantCustomers },
      { segmentType: 'REPEAT', customerCount: metrics.repeatCustomers },
      { segmentType: 'ACTIVE', customerCount: metrics.activeCustomers },
      { segmentType: 'NEW', customerCount: metrics.newCustomers },
    ];

    await this.prismaService.$transaction(async (tx) => {
      await tx.crmCustomerSegmentSnapshot.deleteMany({
        where: { organizationId, date: today },
      });

      for (const row of segmentRows) {
        await tx.crmCustomerSegmentSnapshot.create({
          data: {
            organizationId,
            date: today,
            segmentType: row.segmentType,
            customerCount: row.customerCount,
            metadata: {
              retentionPressure: metrics.retentionPressure,
              topCustomerRevenueShare: metrics.topCustomerRevenueShare,
            } as Prisma.InputJsonValue,
          },
        });
      }
    });

    this.logger.debug({
      event: 'crm.customer_segments.generated',
      organizationId,
      segmentCount: segmentRows.length,
      retentionPressure: metrics.retentionPressure,
    });
  }

  private toCustomerPreview(profile: {
    id: string;
    externalCustomerId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    totalRevenue: Prisma.Decimal | null;
    lastOrderAt: Date | null;
    lifecycleStage: string | null;
  }) {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();

    return {
      id: profile.id,
      externalCustomerId: profile.externalCustomerId,
      name: name || profile.email || 'Unnamed customer',
      totalRevenue: Number(profile.totalRevenue ?? 0),
      lastOrderAt: profile.lastOrderAt ? profile.lastOrderAt.toISOString() : null,
      lifecycleStage: profile.lifecycleStage,
    };
  }
}
