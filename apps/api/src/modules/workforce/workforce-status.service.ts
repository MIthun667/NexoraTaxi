import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkforceStatusCategory } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import {
  WorkforceEvents,
  WorkforceMemberStatusChangedEventPayload,
} from './events/workforce.events';
import { toWorkforceStatusHistoryResponse } from './mappers/workforce.mapper';
import { WorkforcePolicyService } from './policies/workforce-policy.service';
import { UpdateWorkforceStatusDto } from './dto/update-workforce-status.dto';
import { WorkforceRepository } from './workforce.repository';

@Injectable()
export class WorkforceStatusService {
  constructor(
    private readonly workforceRepository: WorkforceRepository,
    private readonly workforcePolicyService: WorkforcePolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async updateStatus(id: string, dto: UpdateWorkforceStatusDto, principal?: CurrentPrincipal) {
    const workforceMember = await this.workforceRepository.findMemberById(id);
    if (!workforceMember) {
      throw new NotFoundException('Workforce member not found.');
    }

    this.workforcePolicyService.assertCanChangeStatus(principal, workforceMember.organizationId);

    const previousValue = this.resolveCurrentStatusValue(workforceMember, dto.category);

    const history = await this.workforceRepository.runInTransaction(async (tx) => {
      await this.workforceRepository.updateMemberStatus(tx, id, dto.category, dto.nextValue);

      return tx.workforceStatusHistory.create({
        data: {
          organizationId: workforceMember.organizationId,
          workforceMemberId: id,
          category: dto.category,
          previousValue,
          nextValue: dto.nextValue,
          reason: dto.reason,
          changedByUserId: principal?.userId ?? null,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        },
        select: {
          id: true,
          organizationId: true,
          workforceMemberId: true,
          category: true,
          previousValue: true,
          nextValue: true,
          reason: true,
          changedByUserId: true,
          effectiveAt: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    await this.auditService.record({
      action: 'workforce.status.update',
      entityType: 'workforce-member',
      entityId: id,
      organizationId: workforceMember.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated ${dto.category.toLowerCase()} for workforce member ${workforceMember.workerCode}.`,
      metadata: {
        previousValue,
        nextValue: dto.nextValue,
        reason: dto.reason ?? null,
      },
    });

    const payload: WorkforceMemberStatusChangedEventPayload = {
      workforceMemberId: id,
      organizationId: workforceMember.organizationId,
      category: dto.category,
      previousValue,
      nextValue: dto.nextValue,
      reason: dto.reason ?? null,
      changedByUserId: principal?.userId ?? null,
    };

    await this.domainEventsService.publish({
      organizationId: workforceMember.organizationId,
      eventType: WorkforceEvents.memberStatusChanged,
      aggregateType: 'workforce-member',
      aggregateId: id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Workforce status updated successfully.',
      toWorkforceStatusHistoryResponse(history),
    );
  }

  private resolveCurrentStatusValue(
    workforceMember: Awaited<ReturnType<WorkforceRepository['findMemberById']>> extends infer T
      ? NonNullable<T>
      : never,
    category: WorkforceStatusCategory,
  ) {
    if (category === WorkforceStatusCategory.OPERATIONAL_STATUS) {
      return workforceMember.operationalStatus;
    }

    if (category === WorkforceStatusCategory.COMPLIANCE_STATUS) {
      return workforceMember.complianceStatus;
    }

    return workforceMember.availabilityStatus;
  }
}
