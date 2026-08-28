import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AssignmentConflictService } from './assignment-conflict.service';
import { AssignmentStatusService } from './assignment-status.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsPolicyService } from './policies/assignments-policy.service';
import { AssignmentsQueryService } from './assignments-query.service';
import { AssignmentsRepository } from './assignments.repository';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [AuditModule],
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    AssignmentsRepository,
    AssignmentsQueryService,
    AssignmentStatusService,
    AssignmentConflictService,
    AssignmentsPolicyService,
  ],
  exports: [
    AssignmentsService,
    AssignmentsQueryService,
    AssignmentStatusService,
    AssignmentConflictService,
  ],
})
export class AssignmentsModule {}
