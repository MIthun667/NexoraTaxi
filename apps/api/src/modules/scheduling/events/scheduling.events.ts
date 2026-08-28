import {
  SchedulePlanStatus,
  SchedulePlanType,
  ScheduleShiftStatus,
  ShiftType,
} from '@prisma/client';

import { DomainEventPayload } from '../../events/domain-events.types';

export const SchedulingEvents = {
  schedulePlanCreated: 'schedule_plan.created',
  schedulePlanUpdated: 'schedule_plan.updated',
  scheduleShiftCreated: 'schedule_shift.created',
  scheduleShiftUpdated: 'schedule_shift.updated',
  scheduleShiftStatusChanged: 'schedule_shift.status_changed',
  scheduleShiftCapacityUpdated: 'schedule_shift.capacity_updated',
  scheduleShiftOverCapacity: 'schedule_shift.over_capacity',
  scheduleShiftUnderstaffed: 'schedule_shift.understaffed',
} as const;

export interface SchedulePlanCreatedEventPayload extends DomainEventPayload {
  schedulePlanId: string;
  organizationId: string;
  name: string;
  planType: SchedulePlanType;
  status: SchedulePlanStatus;
}

export interface SchedulePlanUpdatedEventPayload extends DomainEventPayload {
  schedulePlanId: string;
  organizationId: string;
  changedFields: string[];
}

export interface ScheduleShiftCreatedEventPayload extends DomainEventPayload {
  scheduleShiftId: string;
  organizationId: string;
  shiftCode: string;
  shiftType: ShiftType;
  status: ScheduleShiftStatus;
  zoneId?: string | null;
}

export interface ScheduleShiftUpdatedEventPayload extends DomainEventPayload {
  scheduleShiftId: string;
  organizationId: string;
  changedFields: string[];
}

export interface ScheduleShiftStatusChangedEventPayload extends DomainEventPayload {
  scheduleShiftId: string;
  organizationId: string;
  previousStatus: ScheduleShiftStatus;
  nextStatus: ScheduleShiftStatus;
  changedByUserId?: string | null;
  reason?: string | null;
}

export interface ScheduleShiftCapacityUpdatedEventPayload extends DomainEventPayload {
  scheduleShiftId: string;
  organizationId: string;
  capacityRequired: number | null;
  capacityAllocated: number | null;
  assignedCount: number;
}
