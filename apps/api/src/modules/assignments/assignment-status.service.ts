import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ResourceAssignmentStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { AssignmentsEvents, ResourceAssignmentStatusChangedEventPayload } from './events/assignments.events';
import { toResourceAssignmentResponse } from './mappers/assignment.mapper';
import { AssignmentsPolicyService } from './policies/assignments-policy.service';
import { UpdateResourceAssignmentStatusDto } from './dto/update-resource-assignment-status.dto';
import { AssignmentsRepository } from './assignments.repository';

@Injectable()
export class AssignmentStatusService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly assignmentsPolicyService: AssignmentsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async updateStatus(
    id: string,
    dto: UpdateResourceAssignmentStatusDto,
    principal?: CurrentPrincipal,
  ) {
    const assignment = await this.assignmentsRepository.findAssignmentById(id);
    if (!assignment) {
      throw new NotFoundException('Resource assignment not found.');
    }

    this.assignmentsPolicyService.assertCanTransitionAssignment(
      principal,
      assignment.organizationId,
      assignment.status,
      dto.status,
    );

    const updated = await this.assignmentsRepository.updateAssignment(id, {
      status: dto.status,
      ...(dto.status === ResourceAssignmentStatus.RELEASED ? { releasedAt: new Date() } : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue | undefined }
        : {}),
    });

    await this.auditService.record({
      action: 'resource-assignment.status.update',
      entityType: 'resource-assignment',
      entityId: updated.id,
      organizationId: updated.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Transitioned resource assignment ${updated.id} from ${assignment.status.toLowerCase()} to ${updated.status.toLowerCase()}.`,
      metadata: {
        previousStatus: assignment.status,
        nextStatus: updated.status,
        reason: dto.reason ?? null,
      } as Prisma.InputJsonValue,
    });

    const payload: ResourceAssignmentStatusChangedEventPayload = {
      resourceAssignmentId: updated.id,
      organizationId: updated.organizationId,
      previousStatus: assignment.status,
      nextStatus: updated.status,
      changedByUserId: principal?.userId ?? null,
      reason: dto.reason ?? null,
    };

    await this.domainEventsService.publish({
      organizationId: updated.organizationId,
      eventType: AssignmentsEvents.statusChanged,
      aggregateType: 'resource-assignment',
      aggregateId: updated.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    if (updated.status === ResourceAssignmentStatus.ACTIVE) {
      await this.domainEventsService.publish({
        organizationId: updated.organizationId,
        eventType: AssignmentsEvents.activated,
        aggregateType: 'resource-assignment',
        aggregateId: updated.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    if (updated.status === ResourceAssignmentStatus.RELEASED) {
      await this.domainEventsService.publish({
        organizationId: updated.organizationId,
        eventType: AssignmentsEvents.released,
        aggregateType: 'resource-assignment',
        aggregateId: updated.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    if (updated.status === ResourceAssignmentStatus.CANCELLED) {
      await this.domainEventsService.publish({
        organizationId: updated.organizationId,
        eventType: AssignmentsEvents.cancelled,
        aggregateType: 'resource-assignment',
        aggregateId: updated.id,
        triggeredByUserId: principal?.userId ?? null,
        payload,
      });
    }

    return buildSuccessResponse(
      'Resource assignment status updated successfully.',
      toResourceAssignmentResponse(updated),
    );
  }
}
