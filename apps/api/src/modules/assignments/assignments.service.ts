import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ResourceAssignmentStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateResourceAssignmentDto } from './dto/create-resource-assignment.dto';
import { ReleaseResourceAssignmentDto } from './dto/release-resource-assignment.dto';
import { UpdateResourceAssignmentDto } from './dto/update-resource-assignment.dto';
import {
  AssignmentsEvents,
  ResourceAssignmentCreatedEventPayload,
  ResourceAssignmentUpdatedEventPayload,
} from './events/assignments.events';
import {
  toResourceAssignmentResponse,
} from './mappers/assignment.mapper';
import { AssignmentsPolicyService } from './policies/assignments-policy.service';
import { AssignmentsRepository } from './assignments.repository';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly assignmentsPolicyService: AssignmentsPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async create(dto: CreateResourceAssignmentDto, principal?: CurrentPrincipal) {
    const assignment = await this.assignmentsRepository.createAssignment({
      organization: { connect: { id: dto.organizationId } },
      ...(dto.workforceMemberId
        ? { workforceMember: { connect: { id: dto.workforceMemberId } } }
        : {}),
      ...(dto.assetId ? { asset: { connect: { id: dto.assetId } } } : {}),
      ...(dto.shiftId ? { shift: { connect: { id: dto.shiftId } } } : {}),
      ...(dto.workOrderId ? { workOrder: { connect: { id: dto.workOrderId } } } : {}),
      ...(dto.zoneId ? { zone: { connect: { id: dto.zoneId } } } : {}),
      assignedByUser: principal?.userId ? { connect: { id: principal.userId } } : undefined,
      assignmentType: dto.assignmentType,
      status: dto.status,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'resource-assignment.create',
      entityType: 'resource-assignment',
      entityId: assignment.id,
      organizationId: assignment.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Created resource assignment ${assignment.id}.`,
    });

    const payload: ResourceAssignmentCreatedEventPayload = {
      resourceAssignmentId: assignment.id,
      organizationId: assignment.organizationId,
      assignmentType: assignment.assignmentType,
      status: assignment.status,
      workforceMemberId: assignment.workforceMemberId,
      assetId: assignment.assetId,
      shiftId: assignment.shiftId,
      workOrderId: assignment.workOrderId,
    };

    await this.domainEventsService.publish({
      organizationId: assignment.organizationId,
      eventType: AssignmentsEvents.created,
      aggregateType: 'resource-assignment',
      aggregateId: assignment.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Resource assignment created successfully.',
      toResourceAssignmentResponse(assignment),
    );
  }

  async update(id: string, dto: UpdateResourceAssignmentDto, principal?: CurrentPrincipal) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one assignment field must be provided.');
    }

    const existing = await this.findAssignmentById(id);
    this.assignmentsPolicyService.assertCanManageAssignments(
      principal,
      existing.organizationId,
    );

    const assignment = await this.assignmentsRepository.updateAssignment(id, {
      ...(dto.assignmentType !== undefined ? { assignmentType: dto.assignmentType } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.workforceMemberId !== undefined
        ? dto.workforceMemberId
          ? { workforceMember: { connect: { id: dto.workforceMemberId } } }
          : { workforceMember: { disconnect: true } }
        : {}),
      ...(dto.assetId !== undefined
        ? dto.assetId
          ? { asset: { connect: { id: dto.assetId } } }
          : { asset: { disconnect: true } }
        : {}),
      ...(dto.shiftId !== undefined
        ? dto.shiftId
          ? { shift: { connect: { id: dto.shiftId } } }
          : { shift: { disconnect: true } }
        : {}),
      ...(dto.workOrderId !== undefined
        ? dto.workOrderId
          ? { workOrder: { connect: { id: dto.workOrderId } } }
          : { workOrder: { disconnect: true } }
        : {}),
      ...(dto.zoneId !== undefined
        ? dto.zoneId
          ? { zone: { connect: { id: dto.zoneId } } }
          : { zone: { disconnect: true } }
        : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null
                ? Prisma.JsonNull
                : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
    });

    await this.auditService.record({
      action: 'resource-assignment.update',
      entityType: 'resource-assignment',
      entityId: assignment.id,
      organizationId: assignment.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated resource assignment ${assignment.id}.`,
      metadata: { changedFields: Object.keys(dto) } as Prisma.InputJsonValue,
    });

    const payload: ResourceAssignmentUpdatedEventPayload = {
      resourceAssignmentId: assignment.id,
      organizationId: assignment.organizationId,
      changedFields: Object.keys(dto),
    };

    await this.domainEventsService.publish({
      organizationId: assignment.organizationId,
      eventType: AssignmentsEvents.updated,
      aggregateType: 'resource-assignment',
      aggregateId: assignment.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Resource assignment updated successfully.',
      toResourceAssignmentResponse(assignment),
    );
  }

  async release(id: string, dto: ReleaseResourceAssignmentDto, principal?: CurrentPrincipal) {
    const existing = await this.findAssignmentById(id);
    this.assignmentsPolicyService.assertCanManageAssignments(
      principal,
      existing.organizationId,
    );

    const assignment = await this.assignmentsRepository.updateAssignment(id, {
      status: ResourceAssignmentStatus.RELEASED,
      releasedAt: new Date(),
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'resource-assignment.release',
      entityType: 'resource-assignment',
      entityId: assignment.id,
      organizationId: assignment.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Released resource assignment ${assignment.id}.`,
    });

    await this.domainEventsService.publish({
      organizationId: assignment.organizationId,
      eventType: AssignmentsEvents.released,
      aggregateType: 'resource-assignment',
      aggregateId: assignment.id,
      triggeredByUserId: principal?.userId ?? null,
      payload: {
        resourceAssignmentId: assignment.id,
        organizationId: assignment.organizationId,
        previousStatus: existing.status,
        nextStatus: assignment.status,
        changedByUserId: principal?.userId ?? null,
      },
    });

    return buildSuccessResponse(
      'Resource assignment released successfully.',
      toResourceAssignmentResponse(assignment),
    );
  }

  async findAll() {
    throw new BadRequestException(
      'AssignmentsService.findAll is no longer the primary read path. Use AssignmentsQueryService instead.',
    );
  }

  async findOne() {
    throw new BadRequestException(
      'AssignmentsService.findOne is no longer the primary read path. Use AssignmentsQueryService instead.',
    );
  }

  private async findAssignmentById(id: string) {
    const assignment = await this.assignmentsRepository.findAssignmentById(id);
    if (!assignment) {
      throw new NotFoundException('Resource assignment not found.');
    }
    return assignment;
  }
}
