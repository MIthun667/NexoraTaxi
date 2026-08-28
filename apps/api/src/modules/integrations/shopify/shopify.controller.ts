import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

import { PlatformPermissions } from '../../../common/constants/platform-permissions.constants';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ConnectShopifyDto } from './dto/connect-shopify.dto';
import { QueryShopifyOrganizationDto } from './dto/query-shopify-organization.dto';
import { ShopifyCallbackDto } from './dto/shopify-callback.dto';
import { ShopifySyncDto } from './dto/shopify-sync.dto';
import { ShopifyService } from './shopify.service';

@Controller('integrations/shopify')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

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
