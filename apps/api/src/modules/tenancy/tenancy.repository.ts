import { BillingCycle, Prisma, SubscriptionStatus, UsageMetricType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenancyRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findOrganizationById(id: string) {
    return this.prismaService.organization.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });
  }

  findPlanByCode(code: string) {
    return this.prismaService.subscriptionPlan.findUnique({ where: { code } });
  }

  listPlans() {
    return this.prismaService.subscriptionPlan.findMany({ orderBy: { monthlyPrice: 'asc' } });
  }

  createPlan(data: Prisma.SubscriptionPlanUncheckedCreateInput) {
    return this.prismaService.subscriptionPlan.create({ data });
  }

  findActiveSubscription(organizationId: string) {
    return this.prismaService.organizationSubscription.findFirst({
      where: {
        organizationId,
        status: { in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createSubscription(data: Prisma.OrganizationSubscriptionUncheckedCreateInput) {
    return this.prismaService.organizationSubscription.create({ data });
  }

  updateOrganization(id: string, data: Prisma.OrganizationUncheckedUpdateInput) {
    return this.prismaService.organization.update({ where: { id }, data });
  }

  upsertUsage(input: {
    organizationId: string;
    metricType: UsageMetricType;
    metricValue: number;
    periodStart: Date;
    periodEnd: Date;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prismaService.organizationUsage.upsert({
      where: {
        organizationId_metricType_periodStart_periodEnd: {
          organizationId: input.organizationId,
          metricType: input.metricType,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      },
      create: {
        organizationId: input.organizationId,
        metricType: input.metricType,
        metricValue: input.metricValue,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
      update: {
        metricValue: { increment: input.metricValue },
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }

  getUsageTotal(organizationId: string, metricType: UsageMetricType, periodStart: Date, periodEnd: Date) {
    return this.prismaService.organizationUsage.aggregate({
      _sum: { metricValue: true },
      where: { organizationId, metricType, periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
    });
  }

  createBillingEvent(data: Prisma.OrganizationBillingEventUncheckedCreateInput) {
    return this.prismaService.organizationBillingEvent.create({ data });
  }

  createOrganizationWithAdmin(data: {
    organization: Prisma.OrganizationCreateInput;
    user: Omit<Prisma.UserUncheckedCreateInput, 'organizationId'>;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: data.organization });
      const user = await tx.user.create({ data: { ...data.user, organizationId: organization.id } });
      return { organization, user };
    });
  }
}
