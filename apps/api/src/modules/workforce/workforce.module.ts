import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { WorkforceCredentialService } from './workforce-credential.service';
import { WorkforceController } from './workforce.controller';
import { WorkforcePolicyService } from './policies/workforce-policy.service';
import { WorkforceQueryService } from './workforce-query.service';
import { WorkforceRepository } from './workforce.repository';
import { WorkforceStatusService } from './workforce-status.service';
import { WorkforceService } from './workforce.service';

@Module({
  imports: [AuditModule],
  controllers: [WorkforceController],
  providers: [
    WorkforceService,
    WorkforceRepository,
    WorkforceQueryService,
    WorkforceStatusService,
    WorkforceCredentialService,
    WorkforcePolicyService,
  ],
  exports: [
    WorkforceService,
    WorkforceRepository,
    WorkforceQueryService,
    WorkforceStatusService,
    WorkforceCredentialService,
  ],
})
export class WorkforceModule {}
