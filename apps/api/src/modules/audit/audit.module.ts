import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [PrismaModule, SharedModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
