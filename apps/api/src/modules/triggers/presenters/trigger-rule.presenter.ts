import { TriggerActionType } from '@prisma/client';

export interface TriggerRulePresenter {
  id: string;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  eventType: string;
  aggregateType?: string | null;
  actionType: TriggerActionType;
  actionTarget?: string | null;
  priority: number;
  isEnabled: boolean;
  cooldownSeconds?: number | null;
  dedupeKeyStrategy?: string | null;
  createdByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
