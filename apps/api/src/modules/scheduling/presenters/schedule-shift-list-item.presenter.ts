import { ScheduleShiftStatus, ShiftType } from '@prisma/client';

export interface ScheduleShiftListItemPresenter {
  id: string;
  organizationId: string;
  schedulePlanId: string | null;
  shiftCode: string;
  shiftType: ShiftType;
  title: string;
  status: ScheduleShiftStatus;
  zoneId: string | null;
  ownerUserId: string | null;
  startsAt: Date;
  endsAt: Date;
  capacityRequired: number | null;
  capacityAllocated: number | null;
  createdAt: Date;
  updatedAt: Date;
}
