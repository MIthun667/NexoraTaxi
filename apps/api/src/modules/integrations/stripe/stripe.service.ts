import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSuccessResponse } from '../../../shared/responses/response.util';
import { AuditService } from '../../audit/audit.service';
import { ConnectStripeDto } from './dto/connect-stripe.dto';
import { QueryStripeOrganizationDto } from './dto/query-stripe-organization.dto';
import { StripeApiService } from './stripe-api.service';
import { StripeAuthService } from './stripe-auth.service';
import { StripeCryptoService } from './stripe-crypto.service';

@Injectable()
export class StripeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly stripeApiService: StripeApiService,
    private readonly stripeAuthService: StripeAuthService,
    private readonly stripeCryptoService: StripeCryptoService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async connectOrganizationAccount(principal: CurrentPrincipal, dto: ConnectStripeDto) {
    await this.assertOrganizationAccess(principal, dto.organizationId);
    const secretKey = this.stripeAuthService.validateSecretKey(dto.secretKey);
    const account = await this.stripeApiService.getAccount(secretKey);

    const duplicate = await this.prismaService.integrationStripeAccount.findFirst({
      where: {
        stripeAccountId: account.id,
        isActive: true,
        organizationId: { not: dto.organizationId },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException({
        message: 'This Stripe account is already linked to another organization.',
        error: {
          code: 'duplicate_stripe_connection',
        },
      });
    }

    const stored = await this.prismaService.integrationStripeAccount.upsert({
      where: {
        organizationId_stripeAccountId: {
          organizationId: dto.organizationId,
          stripeAccountId: account.id,
        },
      },
      update: {
        accountEmail: account.email ?? null,
        accessTokenCipher: this.stripeCryptoService.encrypt(secretKey),
        isActive: true,
        disconnectedAt: null,
        metadata: {
          authProvider: 'manual_secret_key',
          chargesEnabled: Boolean(account.charges_enabled),
          detailsSubmitted: Boolean(account.details_submitted),
          country: account.country ?? null,
          defaultCurrency: account.default_currency ?? null,
        } as Prisma.InputJsonValue,
        connectedAt: new Date(),
      },
      create: {
        organizationId: dto.organizationId,
        stripeAccountId: account.id,
        accountEmail: account.email ?? null,
        accessTokenCipher: this.stripeCryptoService.encrypt(secretKey),
        isActive: true,
        metadata: {
          authProvider: 'manual_secret_key',
          chargesEnabled: Boolean(account.charges_enabled),
          detailsSubmitted: Boolean(account.details_submitted),
          country: account.country ?? null,
          defaultCurrency: account.default_currency ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    await this.auditService.record({
      action: 'integration.stripe.connected',
      entityType: 'integration-stripe-account',
      entityId: stored.id,
      organizationId: dto.organizationId,
      actorUserId: principal.userId,
      summary: `Stripe account ${account.id} connected.`,
      metadata: {
        stripeAccountId: account.id,
        accountEmail: account.email ?? null,
      } as Prisma.InputJsonValue,
    });

    this.logger.debug({
      event: 'stripe.connected',
      organizationId: dto.organizationId,
      stripeAccountId: account.id,
    });

    return buildSuccessResponse('Stripe account connected successfully.', {
      account: this.toAccountView(stored),
    });
  }

  async getStatus(principal: CurrentPrincipal, query: QueryStripeOrganizationDto) {
    await this.assertOrganizationAccess(principal, query.organizationId);

    const [account, latestSyncRun] = await Promise.all([
      this.prismaService.integrationStripeAccount.findFirst({
        where: { organizationId: query.organizationId },
        orderBy: [{ isActive: 'desc' }, { connectedAt: 'desc' }],
      }),
      this.prismaService.stripeSyncRun.findFirst({
        where: { organizationId: query.organizationId },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    return buildSuccessResponse('Stripe connection status retrieved successfully.', {
      connected: Boolean(account?.isActive),
      account: account ? this.toAccountView(account) : null,
      latestSyncRun: latestSyncRun
        ? {
            syncRunId: latestSyncRun.id,
            syncType: latestSyncRun.syncType,
            status: latestSyncRun.status,
            recordsProcessed: latestSyncRun.recordsProcessed,
            startedAt: latestSyncRun.startedAt,
            completedAt: latestSyncRun.completedAt,
            errorMessage: latestSyncRun.errorMessage,
            metadata: latestSyncRun.metadata,
          }
        : null,
    });
  }

  private toAccountView(account: {
    id: string;
    organizationId: string;
    stripeAccountId: string;
    accountEmail: string | null;
    isActive: boolean;
    connectedAt: Date;
    disconnectedAt: Date | null;
    metadata: Prisma.JsonValue | null;
  }) {
    return {
      id: account.id,
      organizationId: account.organizationId,
      stripeAccountId: account.stripeAccountId,
      accountEmail: account.accountEmail,
      isActive: account.isActive,
      connectedAt: account.connectedAt,
      disconnectedAt: account.disconnectedAt,
      metadata: account.metadata,
    };
  }

  private async assertOrganizationAccess(principal: CurrentPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException({
        message: 'You do not have access to this organization.',
        error: {
          code: 'organization_access_denied',
        },
      });
    }

    const organization = await this.prismaService.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException({
        message: 'Organization could not be found.',
        error: {
          code: 'organization_not_found',
        },
      });
    }
  }
}
