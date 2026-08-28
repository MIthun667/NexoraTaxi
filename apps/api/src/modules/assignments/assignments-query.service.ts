import { Injectable, NotFoundException } from '@nestjs/common';
import { ResourceAssignmentStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { ListResourceAssignmentsQueryDto } from './dto/list-resource-assignments-query.dto';
import { buildAssignmentsWhere } from './mappers/assignments-where.builder';
import { toResourceAssignmentResponse } from './mappers/assignment.mapper';
import { AssignmentsPolicyService } from './policies/assignments-policy.service';
import { AssignmentDetailPresenter } from './presenters/assignment-detail.presenter';
import { AssignmentsRepository } from './assignments.repository';

@Injectable()
export class AssignmentsQueryService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly assignmentsPolicyService: AssignmentsPolicyService,
  ) {}

  async listAssignments(
    query: ListResourceAssignmentsQueryDto,
    principal?: CurrentPrincipal,
  ) {
    const { page, limit, skip } = resolvePagination(query);
    const where = buildAssignmentsWhere(query, principal);
    const [items, total] = await Promise.all([
      this.assignmentsRepository.listAssignments(where, skip, limit),
      this.assignmentsRepository.countAssignments(where),
    ]);

    return buildPaginatedResponse(
      'Resource assignments retrieved successfully.',
      items.map((item) => toResourceAssignmentResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getAssignmentDetail(id: string, principal?: CurrentPrincipal) {
    const assignment = await this.assignmentsRepository.findAssignmentById(id);
    if (!assignment) {
      throw new NotFoundException('Resource assignment not found.');
    }

    this.assignmentsPolicyService.assertCanViewAssignments(
      principal,
      assignment.organizationId,
    );

    const detail: AssignmentDetailPresenter = {
      ...toResourceAssignmentResponse(assignment),
      metadata: assignment.metadata,
      lifecycle: {
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        releasedAt: assignment.releasedAt,
        isActive: assignment.status === ResourceAssignmentStatus.ACTIVE,
        isReleased: assignment.status === ResourceAssignmentStatus.RELEASED,
        isCancelled: assignment.status === ResourceAssignmentStatus.CANCELLED,
      },
    };

    return buildSuccessResponse(
      'Resource assignment retrieved successfully.',
      detail,
    );
  }
}
