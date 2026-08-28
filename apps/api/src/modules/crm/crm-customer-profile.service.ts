import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, resolvePagination } from '../../shared/pagination/pagination.util';
import { buildPaginatedResponse, buildSuccessResponse } from '../../shared/responses/response.util';
import { QueryCrmCustomersDto } from './dto/query-crm-customers.dto';
import { RebuildCrmProfilesDto } from './dto/rebuild-crm-profiles.dto';

const PROFILE_STALE_AFTER_MS = 60 * 60 * 1000;

@Injectable()
export class CrmCustomerProfileService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async listCustomers(principal: CurrentPrincipal, query: QueryCrmCustomersDto) {
    const organizationId = await this.resolveOrganizationScope(principal, query.organizationId);
    await this.ensureProfilesFresh(organizationId);
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.CrmCustomerProfileWhereInput = { organizationId };
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.crmCustomerProfile.findMany({
        where,
        orderBy: [
          { totalRevenue: 'desc' },
          { lastOrderAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prismaService.crmCustomerProfile.count({ where }),
    ]);

    return buildPaginatedResponse(
      'CRM customer profiles retrieved successfully.',
      items,
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async listHighValueCustomers(principal: CurrentPrincipal, query: QueryCrmCustomersDto) {
    return this.listFilteredCustomers(principal, query, {
      isHighValue: true,
    }, 'High-value customers retrieved successfully.');
  }

  async listAtRiskCustomers(principal: CurrentPrincipal, query: QueryCrmCustomersDto) {
    return this.listFilteredCustomers(principal, query, {
      isAtRisk: true,
    }, 'At-risk customers retrieved successfully.');
  }

  async rebuildProfiles(principal: CurrentPrincipal, dto: RebuildCrmProfilesDto) {
    const organizationId = await this.resolveOrganizationScope(principal, dto.organizationId);
    const result = await this.rebuildProfilesForOrganizationId(organizationId);

    return buildSuccessResponse('CRM customer profiles rebuilt successfully.', result);
  }

  async ensureProfilesFresh(organizationId: string) {
    const latest = await this.prismaService.crmCustomerProfile.findFirst({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    if (!latest || Date.now() - latest.updatedAt.getTime() > PROFILE_STALE_AFTER_MS) {
      await this.rebuildProfilesForOrganizationId(organizationId);
    }
  }

  async rebuildProfilesForOrganizationId(organizationId: string) {
    const [customers, orders] = await Promise.all([
      this.prismaService.shopifyCustomer.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.shopifyOrder.findMany({
        where: { organizationId },
        orderBy: { placedAt: 'desc' },
      }),
    ]);

    const customerMap = new Map(customers.map((customer) => [customer.externalCustomerId, customer]));
    const orderStats = new Map<
      string,
      {
        totalOrders: number;
        totalRevenue: number;
        firstOrderAt: Date | null;
        lastOrderAt: Date | null;
      }
    >();

    for (const order of orders) {
      if (!order.customerExternalId) {
        continue;
      }

      const existing = orderStats.get(order.customerExternalId) ?? {
        totalOrders: 0,
        totalRevenue: 0,
        firstOrderAt: null,
        lastOrderAt: null,
      };
      const placedAt = order.placedAt ?? null;

      existing.totalOrders += 1;
      existing.totalRevenue += Number(order.totalPrice ?? 0);
      existing.firstOrderAt =
        existing.firstOrderAt && placedAt
          ? new Date(Math.min(existing.firstOrderAt.getTime(), placedAt.getTime()))
          : existing.firstOrderAt ?? placedAt;
      existing.lastOrderAt =
        existing.lastOrderAt && placedAt
          ? new Date(Math.max(existing.lastOrderAt.getTime(), placedAt.getTime()))
          : existing.lastOrderAt ?? placedAt;
      orderStats.set(order.customerExternalId, existing);
    }

    const allCustomerIds = new Set<string>([
      ...customerMap.keys(),
      ...orderStats.keys(),
    ]);

    const revenueValues = Array.from(orderStats.values())
      .map((stat) => stat.totalRevenue)
      .filter((value) => value > 0);
    const averageRevenue =
      revenueValues.length > 0
        ? revenueValues.reduce((sum, value) => sum + value, 0) / revenueValues.length
        : 0;
    const totalRevenueAcrossCustomers = revenueValues.reduce((sum, value) => sum + value, 0);
    const highValueRevenueThreshold = Math.max(500, averageRevenue * 1.75);

    await this.prismaService.$transaction(async (tx) => {
      await tx.crmCustomerProfile.deleteMany({
        where: {
          organizationId,
          source: 'shopify',
          ...(allCustomerIds.size > 0
            ? {
                externalCustomerId: {
                  notIn: Array.from(allCustomerIds),
                },
              }
            : {}),
        },
      });

      for (const externalCustomerId of allCustomerIds) {
        const customer = customerMap.get(externalCustomerId) ?? null;
        const stats = orderStats.get(externalCustomerId) ?? {
          totalOrders: 0,
          totalRevenue: 0,
          firstOrderAt: null,
          lastOrderAt: null,
        };
        const averageOrderValue =
          stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
        const daysSinceLastOrder = stats.lastOrderAt
          ? Math.floor((Date.now() - stats.lastOrderAt.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        const customerRevenueShare =
          totalRevenueAcrossCustomers > 0 ? stats.totalRevenue / totalRevenueAcrossCustomers : 0;
        const isHighValue =
          stats.totalRevenue >= highValueRevenueThreshold ||
          (stats.totalOrders >= 5 && stats.totalRevenue >= 250);
        const isDormant = daysSinceLastOrder !== null && daysSinceLastOrder >= 90;
        const isAtRisk =
          stats.totalOrders > 0 &&
          ((isHighValue && daysSinceLastOrder !== null && daysSinceLastOrder >= 45) ||
            (!isHighValue && stats.totalOrders >= 2 && daysSinceLastOrder !== null && daysSinceLastOrder >= 60));

        let lifecycleStage: string;
        if (stats.totalOrders === 0) {
          lifecycleStage = 'NEW';
        } else if (isDormant) {
          lifecycleStage = 'DORMANT';
        } else if (isHighValue) {
          lifecycleStage = 'HIGH_VALUE';
        } else if (isAtRisk) {
          lifecycleStage = 'AT_RISK';
        } else if (stats.totalOrders >= 2) {
          lifecycleStage = 'REPEAT';
        } else {
          lifecycleStage = 'ACTIVE';
        }

        await tx.crmCustomerProfile.upsert({
          where: {
            organizationId_source_externalCustomerId: {
              organizationId,
              source: 'shopify',
              externalCustomerId,
            },
          },
          update: {
            email: customer?.email ?? null,
            firstName: customer?.firstName ?? null,
            lastName: customer?.lastName ?? null,
            phone: customer?.phone ?? null,
            totalOrders: stats.totalOrders,
            totalRevenue: new Prisma.Decimal(stats.totalRevenue),
            averageOrderValue:
              stats.totalOrders > 0 ? new Prisma.Decimal(averageOrderValue) : null,
            firstOrderAt: stats.firstOrderAt,
            lastOrderAt: stats.lastOrderAt,
            isHighValue,
            isAtRisk,
            lifecycleStage,
            tags: customer?.tags ?? null,
            metadata: {
              daysSinceLastOrder,
              customerRevenueShare,
              source: 'shopify',
            } as Prisma.InputJsonValue,
          },
          create: {
            organizationId,
            source: 'shopify',
            externalCustomerId,
            email: customer?.email ?? null,
            firstName: customer?.firstName ?? null,
            lastName: customer?.lastName ?? null,
            phone: customer?.phone ?? null,
            totalOrders: stats.totalOrders,
            totalRevenue: new Prisma.Decimal(stats.totalRevenue),
            averageOrderValue:
              stats.totalOrders > 0 ? new Prisma.Decimal(averageOrderValue) : null,
            firstOrderAt: stats.firstOrderAt,
            lastOrderAt: stats.lastOrderAt,
            isHighValue,
            isAtRisk,
            lifecycleStage,
            tags: customer?.tags ?? null,
            metadata: {
              daysSinceLastOrder,
              customerRevenueShare,
              source: 'shopify',
            } as Prisma.InputJsonValue,
          },
        });
      }
    });

    this.logger.debug({
      event: 'crm.customer_profiles.rebuilt',
      organizationId,
      profileCount: allCustomerIds.size,
      averageRevenue,
      highValueRevenueThreshold,
    });

    return {
      organizationId,
      profilesRebuilt: allCustomerIds.size,
      source: 'shopify',
      rebuiltAt: new Date().toISOString(),
    };
  }

  async resolveOrganizationScope(principal: CurrentPrincipal, organizationId?: string) {
    const scopedOrganizationId = organizationId ?? principal.organizationId;

    if (principal.organizationId !== scopedOrganizationId) {
      throw new NotFoundException('Organization context could not be resolved.');
    }

    const organization = await this.prismaService.organization.findFirst({
      where: { id: scopedOrganizationId, deletedAt: null },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization context could not be resolved.');
    }

    return organization.id;
  }

  private async listFilteredCustomers(
    principal: CurrentPrincipal,
    query: QueryCrmCustomersDto,
    filter: Prisma.CrmCustomerProfileWhereInput,
    successMessage: string,
  ) {
    const organizationId = await this.resolveOrganizationScope(principal, query.organizationId);
    await this.ensureProfilesFresh(organizationId);
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.CrmCustomerProfileWhereInput = {
      organizationId,
      ...filter,
    };
    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.crmCustomerProfile.findMany({
        where,
        orderBy: [
          { totalRevenue: 'desc' },
          { lastOrderAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prismaService.crmCustomerProfile.count({ where }),
    ]);

    return buildPaginatedResponse(
      successMessage,
      items,
      buildPaginationMeta({ page, limit, total }),
    );
  }
}
