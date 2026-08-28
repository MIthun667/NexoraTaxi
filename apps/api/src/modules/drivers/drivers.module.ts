import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [AuditModule, WorkforceModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
