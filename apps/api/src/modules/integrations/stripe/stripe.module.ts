import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StripeApiService } from './stripe-api.service';
import { StripeAuthService } from './stripe-auth.service';
import { StripeController } from './stripe.controller';
import { StripeCryptoService } from './stripe-crypto.service';
import { StripeService } from './stripe.service';
import { StripeSyncService } from './stripe-sync.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [StripeController],
  providers: [
    StripeAuthService,
    StripeCryptoService,
    StripeApiService,
    StripeService,
    StripeSyncService,
  ],
  exports: [
    StripeService,
    StripeSyncService,
  ],
})
export class StripeModule {}
