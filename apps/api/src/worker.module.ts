import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import environmentConfig from './config/environment.config';
import { validationSchema } from './config/validation.schema';
import { ShopifyModule } from './modules/integrations/shopify/shopify.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { IntegrationJobsProcessor } from './modules/jobs/processors/integration-jobs.processor';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      load: [environmentConfig],
      validationSchema,
    }),
    SharedModule,
    JobsModule,
    ShopifyModule,
  ],
  providers: [IntegrationJobsProcessor],
})
export class WorkerModule {}
