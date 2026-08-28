import { Injectable } from '@nestjs/common';
import { Prisma, ResourceAssignmentStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { DomainEventsService } from '../notifications/domain-events.service';
import {
  AssignmentsEvents,
  ResourceAssignmentConflictDetectedEventPayload,
} from './events/assignments.events';
import { AssignmentsPolicyService } from './policies/assignments-policy.service';
import { AssignmentConflictResultPresenter } from './presenters/assignment-conflict-result.presenter';
import { AssignmentsRepository } from './assignments.repository';
import { ValidateAssignmentConflictsDto } from './dto/validate-assignment-conflicts.dto';

@Injectable()
export class AssignmentConflictService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly assignmentsPolicyService: AssignmentsPolicyService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async validateConflicts(
    dto: ValidateAssignmentConflictsDto,
    principal?: CurrentPrincipal,
  ) {
    this.assignmentsPolicyService.assertCanManageAssignments(
      principal,
      dto.organizationId,
    );

    const activeStatuses: ResourceAssignmentStatus[] = [
      ResourceAssignmentStatus.PLANNED,
      ResourceAssignmentStatus.ASSIGNED,
      ResourceAssignmentStatus.ACTIVE,
    ];

    const orConditions: Prisma.ResourceAssignmentWhereInput[] = [];
    if (dto.workforceMemberId) {
      orConditions.push({
        workforceMemberId: dto.workforceMemberId,
        status: { in: activeStatuses },
      });
    }
    if (dto.assetId) {
      orConditions.push({
        assetId: dto.assetId,
        status: { in: activeStatuses },
      });
    }

    const conflicts: string[] = [];
    if (orConditions.length > 0) {
      const existing = await this.assignmentsRepository.findPotentialConflicts({
        organizationId: dto.organizationId,
        OR: orConditions,
      });

      for (const assignment of existing) {
        if (dto.workforceMemberId && assignment.workforceMemberId === dto.workforceMemberId) {
          conflicts.push(
            `Workforce member ${dto.workforceMemberId} already has assignment ${assignment.id} in status ${assignment.status.toLowerCase()}.`,
          );
        }

        if (dto.assetId && assignment.assetId === dto.assetId) {
          conflicts.push(
            `Asset ${dto.assetId} already has assignment ${assignment.id} in status ${assignment.status.toLowerCase()}.`,
          );
        }
      }
    }

    const result: AssignmentConflictResultPresenter = {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };

    if (result.hasConflicts) {
      const payload: ResourceAssignmentConflictDetectedEventPayload = {
        organizationId: dto.organizationId,
        assignmentType: dto.assignmentType,
        workforceMemberId: dto.workforceMemberId ?? null,
        assetId: dto.assetId ?? null,
        shiftId: dto.shiftId ?? null,
        workOrderId: dto.workOrderId ?? null,
        conflicts,
      };

      await this.domainEventsService.publish({
        organizationId: dto.organizationId,
        eventType: AssignmentsEvents.conflictDetected,
        aggregateType: 'resource-assignment',
        payload,
      });
    }

    return buildSuccessResponse(
      'Assignment conflict validation completed successfully.',
      result,
    );
  }
}
