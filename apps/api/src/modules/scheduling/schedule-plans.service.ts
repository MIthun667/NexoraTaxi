import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SchedulePlanStatus } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateSchedulePlanDto } from './dto/create-schedule-plan.dto';
import { ListSchedulePlansQueryDto } from './dto/list-schedule-plans-query.dto';
import { PublishSchedulePlanDto } from './dto/publish-schedule-plan.dto';
import { UpdateSchedulePlanDto } from './dto/update-schedule-plan.dto';
import {
  SchedulePlanCreatedEventPayload,
  SchedulePlanUpdatedEventPayload,
  SchedulingEvents,
} from './events/scheduling.events';
import { buildSchedulePlansWhere } from './mappers/schedule-plans-where.builder';
import { toSchedulePlanResponse, toScheduleShiftResponse } from './mappers/scheduling.mapper';
import { SchedulingPolicyService } from './policies/scheduling-policy.service';
import { SchedulePlanDetailPresenter } from './presenters/schedule-plan-detail.presenter';
import { SchedulePlansRepository } from './schedule-plans.repository';

@Injectable()
export class SchedulePlansService {
  constructor(
    private readonly schedulePlansRepository: SchedulePlansRepository,
    private readonly schedulingPolicyService: SchedulingPolicyService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createPlan(dto: CreateSchedulePlanDto, principal?: CurrentPrincipal) {
    const plan = await this.schedulePlansRepository.createPlan({
      organization: { connect: { id: dto.organizationId } },
      name: dto.name,
      planType: dto.planType,
      status: dto.status,
      planningWindowStart: new Date(dto.planningWindowStart),
      planningWindowEnd: new Date(dto.planningWindowEnd),
      ownerUser: principal?.userId ? { connect: { id: principal.userId } } : undefined,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.record({
      action: 'schedule-plan.create',
      entityType: 'schedule-plan',
      entityId: plan.id,
      organizationId: plan.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Created schedule plan ${plan.name}.`,
    });

    const payload: SchedulePlanCreatedEventPayload = {
      schedulePlanId: plan.id,
      organizationId: plan.organizationId,
      name: plan.name,
      planType: plan.planType,
      status: plan.status,
    };

    await this.domainEventsService.publish({
      organizationId: plan.organizationId,
      eventType: SchedulingEvents.schedulePlanCreated,
      aggregateType: 'schedule-plan',
      aggregateId: plan.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Schedule plan created successfully.',
      toSchedulePlanResponse(plan),
    );
  }

  async listPlans(query: ListSchedulePlansQueryDto, principal?: CurrentPrincipal) {
    const { page, limit, skip } = resolvePagination(query);
    const where = buildSchedulePlansWhere(query, principal);
    const [items, total] = await Promise.all([
      this.schedulePlansRepository.listPlans(where, skip, limit),
      this.schedulePlansRepository.countPlans(where),
    ]);

    return buildPaginatedResponse(
      'Schedule plans retrieved successfully.',
      items.map((item) => toSchedulePlanResponse(item)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getPlanDetail(id: string, principal?: CurrentPrincipal) {
    const plan = await this.schedulePlansRepository.findPlanWithRelations(id);
    if (!plan) {
      throw new NotFoundException('Schedule plan not found.');
    }

    this.schedulingPolicyService.assertCanViewPlans(principal, plan.organizationId);

    const detail: SchedulePlanDetailPresenter = {
      ...toSchedulePlanResponse(plan),
      metadata: plan.metadata,
      shifts: plan.shifts.map((item) => toScheduleShiftResponse(item)),
    };

    return buildSuccessResponse('Schedule plan retrieved successfully.', detail);
  }

  async updatePlan(id: string, dto: UpdateSchedulePlanDto, principal?: CurrentPrincipal) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one schedule plan field must be provided.');
    }

    const existing = await this.findPlanById(id);
    this.schedulingPolicyService.assertCanManagePlans(principal, existing.organizationId);

    const plan = await this.schedulePlansRepository.updatePlan(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.planType !== undefined ? { planType: dto.planType } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.planningWindowStart !== undefined
        ? { planningWindowStart: new Date(dto.planningWindowStart) }
        : {}),
      ...(dto.planningWindowEnd !== undefined
        ? { planningWindowEnd: new Date(dto.planningWindowEnd) }
        : {}),
      ...(dto.metadata !== undefined
        ? {
            metadata:
              dto.metadata === null ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue),
          }
        : {}),
    });

    await this.auditService.record({
      action: 'schedule-plan.update',
      entityType: 'schedule-plan',
      entityId: plan.id,
      organizationId: plan.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Updated schedule plan ${plan.name}.`,
      metadata: { changedFields: Object.keys(dto) },
    });

    const payload: SchedulePlanUpdatedEventPayload = {
      schedulePlanId: plan.id,
      organizationId: plan.organizationId,
      changedFields: Object.keys(dto),
    };

    await this.domainEventsService.publish({
      organizationId: plan.organizationId,
      eventType: SchedulingEvents.schedulePlanUpdated,
      aggregateType: 'schedule-plan',
      aggregateId: plan.id,
      triggeredByUserId: principal?.userId ?? null,
      payload,
    });

    return buildSuccessResponse(
      'Schedule plan updated successfully.',
      toSchedulePlanResponse(plan),
    );
  }

  async publishPlan(id: string, dto: PublishSchedulePlanDto, principal?: CurrentPrincipal) {
    const existing = await this.findPlanById(id);
    this.schedulingPolicyService.assertCanManagePlans(principal, existing.organizationId);

    const plan = await this.schedulePlansRepository.updatePlan(id, {
      status: SchedulePlanStatus.FINALIZED,
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue | undefined }
        : {}),
    });

    await this.auditService.record({
      action: 'schedule-plan.publish',
      entityType: 'schedule-plan',
      entityId: plan.id,
      organizationId: plan.organizationId,
      actorUserId: principal?.userId ?? null,
      summary: `Published schedule plan ${plan.name}.`,
    });

    await this.domainEventsService.publish({
      organizationId: plan.organizationId,
      eventType: SchedulingEvents.schedulePlanUpdated,
      aggregateType: 'schedule-plan',
      aggregateId: plan.id,
      triggeredByUserId: principal?.userId ?? null,
      payload: {
        schedulePlanId: plan.id,
        organizationId: plan.organizationId,
        changedFields: ['status'],
      } satisfies SchedulePlanUpdatedEventPayload,
    });

    return buildSuccessResponse(
      'Schedule plan published successfully.',
      toSchedulePlanResponse(plan),
    );
  }

  private async findPlanById(id: string) {
    const plan = await this.schedulePlansRepository.findPlanById(id);
    if (!plan) {
      throw new NotFoundException('Schedule plan not found.');
    }
    return plan;
  }
}
