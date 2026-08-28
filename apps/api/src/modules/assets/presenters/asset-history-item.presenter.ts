import { AssetStatusCategory } from '@prisma/client';

export interface AssetHistoryItemPresenter {
  id: string;
  category: AssetStatusCategory;
  previousValue: string | null;
  nextValue: string;
  reason: string | null;
  changedByUserId: string | null;
  effectiveAt: Date;
}
