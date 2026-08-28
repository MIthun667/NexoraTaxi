import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { FleetModule } from '../fleet/fleet.module';
import { AssetMaintenanceService } from './asset-maintenance.service';
import { AssetStatusService } from './asset-status.service';
import { AssetsController } from './assets.controller';
import { AssetsPolicyService } from './policies/assets-policy.service';
import { AssetsQueryService } from './assets-query.service';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';

@Module({
  imports: [AuditModule, FleetModule],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    AssetsRepository,
    AssetsQueryService,
    AssetStatusService,
    AssetMaintenanceService,
    AssetsPolicyService,
  ],
  exports: [
    AssetsService,
    AssetsRepository,
    AssetsQueryService,
    AssetStatusService,
    AssetMaintenanceService,
  ],
})
export class AssetsModule {}
