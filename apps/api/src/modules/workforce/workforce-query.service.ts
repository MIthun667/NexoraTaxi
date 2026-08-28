import { Injectable, NotFoundException } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { buildWorkforceListWhere } from './mappers/workforce-where.builder';
import {
  toCredentialDocumentResponse,
  toWorkforceMemberResponse,
  toWorkforceStatusHistoryResponse,
} from './mappers/workforce.mapper';
import { ListWorkforceMembersQueryDto } from './dto/list-workforce-members-query.dto';
import { WorkforceRepository } from './workforce.repository';
import { WorkforcePolicyService } from './policies/workforce-policy.service';
import { WorkforceDetailPresenter } from './presenters/workforce-detail.presenter';

@Injectable()
export class WorkforceQueryService {
  constructor(
    private readonly workforceRepository: WorkforceRepository,
    private readonly workforcePolicyService: WorkforcePolicyService,
  ) {}

  async listWorkforceMembers(
    query: ListWorkforceMembersQueryDto,
    principal?: CurrentPrincipal,
  ) {
    const { page, limit, skip } = resolvePagination(query);
    const where = buildWorkforceListWhere(query, principal);
    const [items, total] = await Promise.all([
      this.workforceRepository.listMembers(where, skip, limit),
      this.workforceRepository.countMembers(where),
    ]);

    return buildPaginatedResponse(
      'Workforce members retrieved successfully.',
      items.map((item) => toWorkforceMemberResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getWorkforceMemberDetail(id: string, principal?: CurrentPrincipal) {
    const workforceMember = await this.workforceRepository.findMemberWithRelations(id);
    if (!workforceMember) {
      throw new NotFoundException('Workforce member not found.');
    }

    this.workforcePolicyService.assertCanView(principal, workforceMember.organizationId);

    const detail: WorkforceDetailPresenter = {
      ...toWorkforceMemberResponse(workforceMember),
      employeeId: workforceMember.employeeId,
      userId: workforceMember.userId,
      employmentModel: workforceMember.employmentModel,
      phoneNumber: workforceMember.phoneNumber,
      skills: workforceMember.skills,
      metadata: workforceMember.metadata,
      credentialSummary: workforceMember.credentialDocuments.map((item) =>
        toCredentialDocumentResponse(item),
      ),
      latestStatusChanges: workforceMember.statusHistory.map((item) =>
        toWorkforceStatusHistoryResponse(item),
      ),
      readiness: {
        isOperationallyReady:
          workforceMember.operationalStatus === 'ACTIVE' &&
          workforceMember.complianceStatus === 'COMPLIANT' &&
          workforceMember.availabilityStatus === 'AVAILABLE',
        hasExpiringCredentials: workforceMember.credentialDocuments.some(
          (item) =>
            item.expiresAt !== null &&
            item.expiresAt.getTime() <= Date.now() + 1000 * 60 * 60 * 24 * 30,
        ),
        blockingIssues: [
          ...(workforceMember.operationalStatus !== 'ACTIVE'
            ? [`Operational status is ${workforceMember.operationalStatus.toLowerCase()}.`]
            : []),
          ...(workforceMember.complianceStatus !== 'COMPLIANT'
            ? [`Compliance status is ${workforceMember.complianceStatus.toLowerCase()}.`]
            : []),
          ...(workforceMember.availabilityStatus !== 'AVAILABLE'
            ? [`Availability status is ${workforceMember.availabilityStatus.toLowerCase()}.`]
            : []),
        ],
      },
    };

    return buildSuccessResponse('Workforce member retrieved successfully.', detail);
  }

  async getWorkforceHistory(id: string, principal?: CurrentPrincipal) {
    const workforceMember = await this.workforceRepository.findMemberById(id);
    if (!workforceMember) {
      throw new NotFoundException('Workforce member not found.');
    }

    this.workforcePolicyService.assertCanView(principal, workforceMember.organizationId);
    const history = await this.workforceRepository.listStatusHistory(id);

    return buildSuccessResponse(
      'Workforce history retrieved successfully.',
      history.map((item) => toWorkforceStatusHistoryResponse(item)),
    );
  }

  async getWorkforceReadinessSummary(organizationId: string) {
    const [activeCount, compliantCount, availableCount, expiringSoonCount] =
      await this.workforceRepository.getReadinessCounts(organizationId);

    return buildSuccessResponse('Workforce readiness summary retrieved successfully.', {
      organizationId,
      activeCount,
      compliantCount,
      availableCount,
      expiringSoonCount,
      generatedAt: new Date().toISOString(),
    });
  }
}
