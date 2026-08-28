import { Module } from '@nestjs/common';

import { AuthzController } from './authz.controller';
import { RbacService } from './rbac.service';

@Module({
  controllers: [AuthzController],
  providers: [RbacService],
  exports: [RbacService],
})
export class AuthzModule {}
