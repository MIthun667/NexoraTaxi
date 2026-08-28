import { SchedulePlanStatus, SchedulePlanType } from '@prisma/client';

export interface SchedulePlanListItemPresenter {
  id: string;
  organizationId: string;
  name: string;
  planType: SchedulePlanType;
  status: SchedulePlanStatus;
  planningWindowStart: Date;
  planningWindowEnd: Date;
  ownerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
