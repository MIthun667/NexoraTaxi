import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../../common/constants/platform-permissions.constants';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { ConnectStripeDto } from './dto/connect-stripe.dto';
import { QueryStripeOrganizationDto } from './dto/query-stripe-organization.dto';
import { StripeSyncDto } from './dto/stripe-sync.dto';
import { StripeService } from './stripe.service';
import { StripeSyncService } from './stripe-sync.service';

@Controller()
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeSyncService: StripeSyncService,
  ) {}

  @Post('integrations/stripe/connect')
  @Permissions(PlatformPermissions.organizationManage)
  connect(@Req() request: Request, @Body() dto: ConnectStripeDto) {
    return this.stripeService.connectOrganizationAccount(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('integrations/stripe/status')
  @Permissions(PlatformPermissions.intelligenceRead)
  getStatus(@Req() request: Request, @Query() query: QueryStripeOrganizationDto) {
    return this.stripeService.getStatus(request.principal as CurrentPrincipal, query);
  }

  @Post('integrations/stripe/sync')
  @Permissions(PlatformPermissions.organizationManage)
  sync(@Req() request: Request, @Body() dto: StripeSyncDto) {
    return this.stripeSyncService.syncForOrganization(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('finance/stripe/summary')
  @Permissions(PlatformPermissions.intelligenceRead)
  getFinanceSummary(@Req() request: Request, @Query() query: QueryStripeOrganizationDto) {
    return this.stripeSyncService.getFinanceSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }
}
