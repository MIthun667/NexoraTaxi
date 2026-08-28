import { SchedulePlan, ScheduleShift } from '@prisma/client';

export const SCHEDULE_PLAN_SELECT = {
  id: true,
  organizationId: true,
  name: true,
  planType: true,
  status: true,
  planningWindowStart: true,
  planningWindowEnd: true,
  ownerUserId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const SCHEDULE_SHIFT_SELECT = {
  id: true,
  organizationId: true,
  schedulePlanId: true,
  shiftCode: true,
  shiftType: true,
  title: true,
  status: true,
  zoneId: true,
  ownerUserId: true,
  startsAt: true,
  endsAt: true,
  capacityRequired: true,
  capacityAllocated: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type SchedulePlanResponse = Pick<
  SchedulePlan,
  | 'id'
  | 'organizationId'
  | 'name'
  | 'planType'
  | 'status'
  | 'planningWindowStart'
  | 'planningWindowEnd'
  | 'ownerUserId'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export type ScheduleShiftResponse = Pick<
  ScheduleShift,
  | 'id'
  | 'organizationId'
  | 'schedulePlanId'
  | 'shiftCode'
  | 'shiftType'
  | 'title'
  | 'status'
  | 'zoneId'
  | 'ownerUserId'
  | 'startsAt'
  | 'endsAt'
  | 'capacityRequired'
  | 'capacityAllocated'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
>;

export const toSchedulePlanResponse = (plan: SchedulePlanResponse): SchedulePlanResponse => plan;
export const toScheduleShiftResponse = (
  shift: ScheduleShiftResponse,
): ScheduleShiftResponse => shift;
