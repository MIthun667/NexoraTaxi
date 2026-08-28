import { WorkOrderListItemPresenter } from './work-order-list-item.presenter';
import { WorkOrderLifecycleSummaryPresenter } from './work-order-lifecycle-summary.presenter';

export interface WorkOrderDetailPresenter extends WorkOrderListItemPresenter {
  sourceType: string | null;
  sourceId: string | null;
  metadata: unknown;
  lifecycle: WorkOrderLifecycleSummaryPresenter;
}
