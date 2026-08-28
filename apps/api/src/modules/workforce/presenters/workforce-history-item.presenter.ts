import { WorkforceStatusCategory } from '@prisma/client';

export interface WorkforceHistoryItemPresenter {
  id: string;
  category: WorkforceStatusCategory;
  previousValue: string | null;
  nextValue: string;
  reason: string | null;
  changedByUserId: string | null;
  effectiveAt: Date;
}
