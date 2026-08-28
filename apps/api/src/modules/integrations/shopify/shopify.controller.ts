import { createHash } from 'node:crypto';

import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { PlatformPermissions } from '../../../common/constants/platform-permissions.constants';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { AuditService } from '../../audit/audit.service';
import { JobsService } from '../../jobs/jobs.service';
import { ConnectShopifyDto } from './dto/connect-shopify.dto';
import { QueryShopifyOrganizationDto } from './dto/query-shopify-organization.dto';
import { ShopifyCallbackDto } from './dto/shopify-callback.dto';
import { ShopifySyncDto } from './dto/shopify-sync.dto';
import { ShopifyService } from './shopify.service';

@Controller('integrations/shopify')
export class ShopifyController {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly jobsService: JobsService,
    private readonly auditService: AuditService,
    private readonly logger: PlatformLoggerService,
  ) {}

  @Get('connect')
  @Permissions(PlatformPermissions.organizationManage)
  connect(
    @Req() request: Request,
    @Query() query: ConnectShopifyDto,
  ) {
    return this.shopifyService.connectOrganizationStore(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('callback')
  @Public()
  async callback(
    @Query() query: ShopifyCallbackDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result = await this.shopifyService.handleOAuthCallback(
      query,
      request.query as Record<string, string | string[] | undefined>,
    );

    const store = result.data.store;
    const executionKey = createHash('sha256').update(query.state).digest('hex');

    try {
      const queued = await this.jobsService.enqueueShopifyInitialSync({
        organizationId: store.organizationId,
        shopifyStoreId: store.id,
        executionKey,
      });

      await this.auditService.record({
        action: 'integration.shopify.initial_sync.requested',
        entityType: 'integration-shopify-store',
        entityId: store.id,
        organizationId: store.organizationId,
        summary: `Initial Shopify synchronization was queued for ${store.shopDomain}.`,
        metadata: {
          jobId: queued.jobId,
          correlationId: queued.correlationId,
        } as Prisma.InputJsonValue,
      });
    } catch (error) {
      this.logger.warn({
        event: 'shopify.initial_sync.enqueue_failed',
        organizationId: store.organizationId,
        shopifyStoreId: store.id,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    response.redirect(result.data.redirectUrl);
  }

  @Get('status')
  @Permissions(PlatformPermissions.intelligenceRead)
  getStatus(@Req() request: Request, @Query() query: QueryShopifyOrganizationDto) {
    return this.shopifyService.getConnectionStatus(
      request.principal as CurrentPrincipal,
      query.organizationId,
    );
  }

  @Post('sync')
  @Permissions(PlatformPermissions.organizationManage)
  sync(@Req() request: Request, @Body() body: ShopifySyncDto) {
    return this.shopifyService.syncAll(request.principal as CurrentPrincipal, body);
  }
}
