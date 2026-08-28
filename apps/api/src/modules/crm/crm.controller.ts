import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { CrmCustomerIntelligenceService } from './crm-customer-intelligence.service';
import { CrmCustomerProfileService } from './crm-customer-profile.service';
import { QueryCrmCustomersDto } from './dto/query-crm-customers.dto';
import { RebuildCrmProfilesDto } from './dto/rebuild-crm-profiles.dto';

@Controller('crm')
export class CrmController {
  constructor(
    private readonly crmCustomerProfileService: CrmCustomerProfileService,
    private readonly crmCustomerIntelligenceService: CrmCustomerIntelligenceService,
  ) {}

  @Get('customers')
  @Permissions(PlatformPermissions.intelligenceRead)
  listCustomers(@Req() request: Request, @Query() query: QueryCrmCustomersDto) {
    return this.crmCustomerProfileService.listCustomers(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('customers/high-value')
  @Permissions(PlatformPermissions.intelligenceRead)
  listHighValueCustomers(@Req() request: Request, @Query() query: QueryCrmCustomersDto) {
    return this.crmCustomerProfileService.listHighValueCustomers(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('customers/at-risk')
  @Permissions(PlatformPermissions.intelligenceRead)
  listAtRiskCustomers(@Req() request: Request, @Query() query: QueryCrmCustomersDto) {
    return this.crmCustomerProfileService.listAtRiskCustomers(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('segments')
  @Permissions(PlatformPermissions.intelligenceRead)
  getSegments(@Req() request: Request, @Query() query: QueryCrmCustomersDto) {
    return this.crmCustomerIntelligenceService.getSegments(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('rebuild-profiles')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  rebuildProfiles(@Req() request: Request, @Body() dto: RebuildCrmProfilesDto) {
    return this.crmCustomerProfileService.rebuildProfiles(
      request.principal as CurrentPrincipal,
      dto,
    );
  }
}
