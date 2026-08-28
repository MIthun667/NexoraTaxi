import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../../common/constants/platform-permissions.constants';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ShopifySyncDto } from './dto/shopify-sync.dto';
import { ShopifyIncrementalSyncService } from './shopify-incremental-sync.service';
import { ShopifySyncService } from './shopify-sync.service';

@Controller('integrations/shopify/sync')
export class ShopifySyncController {
  constructor(
    private readonly shopifySyncService: ShopifySyncService,
    private readonly shopifyIncrementalSyncService: ShopifyIncrementalSyncService,
  ) {}

  @Post('orders')
  @Permissions(PlatformPermissions.organizationManage)
  syncOrders(@Req() request: Request, @Body() dto: ShopifySyncDto) {
    return this.shopifySyncService.syncOrdersForOrganization(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('products')
  @Permissions(PlatformPermissions.organizationManage)
  syncProducts(@Req() request: Request, @Body() dto: ShopifySyncDto) {
    return this.shopifySyncService.syncProductsForOrganization(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('customers')
  @Permissions(PlatformPermissions.organizationManage)
  syncCustomers(@Req() request: Request, @Body() dto: ShopifySyncDto) {
    return this.shopifySyncService.syncCustomersForOrganization(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('all')
  @Permissions(PlatformPermissions.organizationManage)
  syncAll(@Req() request: Request, @Body() dto: ShopifySyncDto) {
    return this.shopifySyncService.syncAllForOrganization(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('incremental/orders')
  @Permissions(PlatformPermissions.organizationManage)
  syncOrdersIncremental(@Req() request: Request, @Body() dto: ShopifySyncDto) {
    return this.shopifyIncrementalSyncService.syncOrdersIncremental(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('incremental/products')
  @Permissions(PlatformPermissions.organizationManage)
  syncProductsIncremental(@Req() request: Request, @Body() dto: ShopifySyncDto) {
    return this.shopifyIncrementalSyncService.syncProductsIncremental(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('incremental/customers')
  @Permissions(PlatformPermissions.organizationManage)
  syncCustomersIncremental(@Req() request: Request, @Body() dto: ShopifySyncDto) {
    return this.shopifyIncrementalSyncService.syncCustomersIncremental(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('status')
  @Permissions(PlatformPermissions.intelligenceRead)
  getStatus(@Req() request: Request, @Query() query: ShopifySyncDto) {
    return this.shopifySyncService.getSyncStatus(
      request.principal as CurrentPrincipal,
      query,
    );
  }
}
