import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSuccessResponse } from '../../../shared/responses/response.util';
import { AuditService } from '../../audit/audit.service';
import { StripeApiService } from './stripe-api.service';
import { QueryStripeOrganizationDto } from './dto/query-stripe-organization.dto';
import { StripeSyncDto } from './dto/stripe-sync.dto';

@Injectable()
export class StripeSyncService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly stripeApiService: StripeApiService,
    private readonly auditService: AuditService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async syncForOrganization(principal: CurrentPrincipal, dto: StripeSyncDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const run = await this.runSync(dto.organizationId, dto.limit ?? 50);
    return buildSuccessResponse('Stripe data synced successfully.', this.toSyncRunView(run));
  }

  async getFinanceSummary(principal: CurrentPrincipal, query: QueryStripeOrganizationDto) {
    await this.assertOrganizationAccess(principal, query.organizationId);
    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousWindowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [
      activeAccount,
      latestSyncRun,
      todayRevenue,
      todayCharges,
      failedPaymentsCurrent,
      failedPaymentsPrevious,
      refundsCurrent,
      disputesCurrent,
      stripeRevenueCurrent,
      stripeRevenuePrevious,
      successfulChargesCurrent,
      successfulChargesPrevious,
      shopifyOrdersCurrent,
      shopifyOrdersPrevious,
    ] = await Promise.all([
      this.prismaService.integrationStripeAccount.findFirst({
        where: { organizationId: query.organizationId, isActive: true },
        orderBy: { connectedAt: 'desc' },
      }),
      this.prismaService.stripeSyncRun.findFirst({
        where: { organizationId: query.organizationId },
        orderBy: { startedAt: 'desc' },
      }),
      this.prismaService.stripeCharge.aggregate({
        where: {
          organizationId: query.organizationId,
          paid: true,
          refunded: false,
          createdAtRemote: { gte: startOfToday, lte: now },
        },
        _sum: { amount: true },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId: query.organizationId,
          createdAtRemote: { gte: startOfToday, lte: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId: query.organizationId,
          status: 'failed',
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId: query.organizationId,
          status: 'failed',
          createdAtRemote: { gte: previousWindowStart, lt: currentWindowStart },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId: query.organizationId,
          refunded: true,
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId: query.organizationId,
          disputed: true,
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.aggregate({
        where: {
          organizationId: query.organizationId,
          paid: true,
          refunded: false,
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
        _sum: { amount: true },
      }),
      this.prismaService.stripeCharge.aggregate({
        where: {
          organizationId: query.organizationId,
          paid: true,
          refunded: false,
          createdAtRemote: { gte: previousWindowStart, lt: currentWindowStart },
        },
        _sum: { amount: true },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId: query.organizationId,
          paid: true,
          status: 'succeeded',
          createdAtRemote: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.stripeCharge.count({
        where: {
          organizationId: query.organizationId,
          paid: true,
          status: 'succeeded',
          createdAtRemote: { gte: previousWindowStart, lt: currentWindowStart },
        },
      }),
      this.prismaService.shopifyOrder.count({
        where: {
          organizationId: query.organizationId,
          placedAt: { gte: currentWindowStart, lt: now },
        },
      }),
      this.prismaService.shopifyOrder.count({
        where: {
          organizationId: query.organizationId,
          placedAt: { gte: previousWindowStart, lt: currentWindowStart },
        },
      }),
    ]);

    return buildSuccessResponse('Stripe finance summary retrieved successfully.', {
      connected: Boolean(activeAccount?.isActive),
      account: activeAccount
        ? {
            id: activeAccount.id,
            stripeAccountId: activeAccount.stripeAccountId,
            accountEmail: activeAccount.accountEmail,
            connectedAt: activeAccount.connectedAt,
            isActive: activeAccount.isActive,
          }
        : null,
      latestSyncRun: latestSyncRun ? this.toSyncRunView(latestSyncRun) : null,
      metrics: {
        confirmedRevenueToday: Number(todayRevenue._sum.amount ?? 0),
        chargesToday: todayCharges,
        failedPaymentsCurrent24h: failedPaymentsCurrent,
        failedPaymentsPrevious24h: failedPaymentsPrevious,
        refundsCurrent24h: refundsCurrent,
        disputesCurrent24h: disputesCurrent,
        stripeRevenueCurrent24h: Number(stripeRevenueCurrent._sum.amount ?? 0),
        stripeRevenuePrevious24h: Number(stripeRevenuePrevious._sum.amount ?? 0),
        successfulChargesCurrent24h: successfulChargesCurrent,
        successfulChargesPrevious24h: successfulChargesPrevious,
        shopifyOrdersCurrent24h: shopifyOrdersCurrent,
        shopifyOrdersPrevious24h: shopifyOrdersPrevious,
      },
    });
  }

  private async runSync(organizationId: string, limit: number) {
    const account = await this.stripeApiService.getActiveAccountForOrganization(organizationId);
    const run = await this.prismaService.stripeSyncRun.create({
      data: {
        organizationId,
        stripeAccountRefId: account.id,
        syncType: 'charges_and_events',
        status: 'RUNNING',
        metadata: {
          limit,
          stripeAccountId: account.stripeAccountId,
        } as Prisma.InputJsonValue,
      },
    });

    try {
      const [charges, events] = await Promise.all([
        this.stripeApiService.getCharges(account.secretKey, limit),
        this.stripeApiService.getPaymentEvents(account.secretKey, limit),
      ]);

      await Promise.all([
        this.upsertCharges(organizationId, account.id, charges),
        this.upsertEvents(organizationId, account.id, events),
      ]);

      const completed = await this.prismaService.stripeSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          recordsProcessed: charges.length + events.length,
        },
      });

      await this.auditService.record({
        action: 'integration.stripe.sync.completed',
        entityType: 'stripe-sync-run',
        entityId: completed.id,
        organizationId,
        summary: 'Stripe charges and payment events synced successfully.',
        metadata: {
          stripeAccountId: account.stripeAccountId,
          recordsProcessed: completed.recordsProcessed,
        } as Prisma.InputJsonValue,
      });

      this.logger.debug({
        event: 'stripe.sync.completed',
        organizationId,
        stripeAccountId: account.stripeAccountId,
        syncRunId: completed.id,
        recordsProcessed: completed.recordsProcessed,
      });

      return completed;
    } catch (error) {
      const failed = await this.prismaService.stripeSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown Stripe sync failure',
        },
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Stripe sync failed.',
        error: {
          code: 'stripe_sync_failed',
          details: failed.errorMessage,
        },
      });
    }
  }

  private async upsertCharges(
    organizationId: string,
    stripeAccountRefId: string,
    charges: Array<{
      id: string;
      payment_intent?: string | null;
      customer?: string | null;
      amount?: number | null;
      currency?: string | null;
      status?: string | null;
      paid?: boolean | null;
      refunded?: boolean | null;
      disputed?: boolean | null;
      created?: number | null;
    }>,
  ) {
    await Promise.all(
      charges.map((charge) =>
        this.prismaService.stripeCharge.upsert({
          where: {
            stripeAccountRefId_externalChargeId: {
              stripeAccountRefId,
              externalChargeId: charge.id,
            },
          },
          update: {
            paymentIntentId: charge.payment_intent ?? null,
            customerId: charge.customer ?? null,
            amount: charge.amount !== undefined && charge.amount !== null ? new Prisma.Decimal(charge.amount / 100) : null,
            currency: charge.currency ?? null,
            status: charge.status ?? null,
            paid: charge.paid ?? null,
            refunded: charge.refunded ?? null,
            disputed: charge.disputed ?? null,
            createdAtRemote: charge.created ? new Date(charge.created * 1000) : null,
            rawPayload: charge as unknown as Prisma.InputJsonValue,
          },
          create: {
            organizationId,
            stripeAccountRefId,
            externalChargeId: charge.id,
            paymentIntentId: charge.payment_intent ?? null,
            customerId: charge.customer ?? null,
            amount: charge.amount !== undefined && charge.amount !== null ? new Prisma.Decimal(charge.amount / 100) : null,
            currency: charge.currency ?? null,
            status: charge.status ?? null,
            paid: charge.paid ?? null,
            refunded: charge.refunded ?? null,
            disputed: charge.disputed ?? null,
            createdAtRemote: charge.created ? new Date(charge.created * 1000) : null,
            rawPayload: charge as unknown as Prisma.InputJsonValue,
          },
        }),
      ),
    );
  }

  private async upsertEvents(
    organizationId: string,
    stripeAccountRefId: string,
    events: Array<{
      id: string;
      type: string;
      created?: number | null;
      data?: {
        object?: Record<string, unknown>;
      };
    }>,
  ) {
    await Promise.all(
      events.map((event) =>
        this.prismaService.stripePaymentEvent.upsert({
          where: {
            stripeAccountRefId_externalEventId: {
              stripeAccountRefId,
              externalEventId: event.id,
            },
          },
          update: {
            type: event.type,
            createdAtRemote: event.created ? new Date(event.created * 1000) : null,
            rawPayload: event as unknown as Prisma.InputJsonValue,
          },
          create: {
            organizationId,
            stripeAccountRefId,
            externalEventId: event.id,
            type: event.type,
            createdAtRemote: event.created ? new Date(event.created * 1000) : null,
            rawPayload: event as unknown as Prisma.InputJsonValue,
          },
        }),
      ),
    );
  }

  private toSyncRunView(run: {
    id: string;
    syncType: string;
    status: string;
    recordsProcessed: number;
    startedAt: Date;
    completedAt: Date | null;
    errorMessage: string | null;
    metadata: Prisma.JsonValue | null;
  }) {
    return {
      syncRunId: run.id,
      syncType: run.syncType,
      status: run.status,
      recordsProcessed: run.recordsProcessed,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      errorMessage: run.errorMessage,
      metadata: run.metadata,
    };
  }

  private async assertOrganizationAccess(principal: CurrentPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException({
        message: 'You do not have access to this organization.',
        error: { code: 'organization_access_denied' },
      });
    }

    const organization = await this.prismaService.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException({
        message: 'Organization could not be found.',
        error: { code: 'organization_not_found' },
      });
    }
  }
}
