import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { buildSuccessResponse } from '../../shared/responses/response.util';

@Controller('authz')
export class AuthzController {
  @Get('me')
  @Permissions(PlatformPermissions.organizationRead)
  getCurrentPrincipal(@Req() request: Request) {
    return buildSuccessResponse(
      'Current authorization principal retrieved successfully.',
      request.principal ?? null,
    );
  }
}
