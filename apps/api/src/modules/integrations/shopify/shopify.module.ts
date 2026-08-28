import { forwardRef, Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { IntelligenceModule } from '../../intelligence/intelligence.module';
import { JobsModule } from '../../jobs/jobs.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ShopifyApiService } from './shopify-api.service';
import { ShopifyAuthService } from './shopify-auth.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyCryptoService } from './shopify-crypto.service';
import { ShopifyIncrementalSyncService } from './shopify-incremental-sync.service';
import { ShopifyService } from './shopify.service';
import { ShopifySyncController } from './shopify-sync.controller';
import { ShopifySyncService } from './shopify-sync.service';
import { ShopifyWebhookController } from './shopify-webhook.controller';
import { ShopifyWebhookRegistrationService } from './shopify-webhook-registration.service';
import { ShopifyWebhookService } from './shopify-webhook.service';
import { ShopifyWebhookValidatorService } from './shopify-webhook-validator.service';

@Module({
  imports: [PrismaModule, AuditModule, JobsModule, forwardRef(() => IntelligenceModule)],
  controllers: [ShopifyController, ShopifySyncController, ShopifyWebhookController],
  providers: [
    ShopifyAuthService,
    ShopifyCryptoService,
    ShopifyApiService,
    ShopifyService,
    ShopifySyncService,
    ShopifyWebhookValidatorService,
    ShopifyWebhookService,
    ShopifyWebhookRegistrationService,
    ShopifyIncrementalSyncService,
  ],
  exports: [
    ShopifyService,
    ShopifyAuthService,
    ShopifyCryptoService,
    ShopifyApiService,
    ShopifySyncService,
    ShopifyWebhookService,
    ShopifyWebhookRegistrationService,
    ShopifyIncrementalSyncService,
  ],
})
export class ShopifyModule {}
