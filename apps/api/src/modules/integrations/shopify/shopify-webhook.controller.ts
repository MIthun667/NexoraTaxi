import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../../common/constants/platform-permissions.constants';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { RegisterShopifyWebhooksDto } from './dto/register-shopify-webhooks.dto';
import { ShopifyWebhookRegistrationService } from './shopify-webhook-registration.service';
import { ShopifyWebhookService } from './shopify-webhook.service';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@Controller('integrations/shopify/webhooks')
export class ShopifyWebhookController {
  constructor(
    private readonly registrationService: ShopifyWebhookRegistrationService,
    private readonly webhookService: ShopifyWebhookService,
  ) {}

  @Post('register')
  @Permissions(PlatformPermissions.organizationManage)
  register(@Req() request: Request, @Body() dto: RegisterShopifyWebhooksDto) {
    return this.registrationService.registerWebhooksForOrganization(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post()
  @Public()
  receive(@Req() request: RawBodyRequest) {
    if (!request.rawBody) {
      throw new BadRequestException(
        'Shopify webhook raw body is required for signature verification.',
      );
    }

    return this.webhookService.processWebhookDelivery({
      headers: request.headers as Record<string, string | string[] | undefined>,
      rawBody: request.rawBody,
    });
  }

  @Get('status')
  @Permissions(PlatformPermissions.organizationManage)
  getStatus(@Req() request: Request, @Query() query: RegisterShopifyWebhooksDto) {
    return this.webhookService.getWebhookStatus(
      request.principal as CurrentPrincipal,
      query,
    );
  }
}
