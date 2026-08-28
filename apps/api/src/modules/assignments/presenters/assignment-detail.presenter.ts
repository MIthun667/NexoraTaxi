import { AssignmentListItemPresenter } from './assignment-list-item.presenter';
import { AssignmentLifecycleSummaryPresenter } from './assignment-lifecycle-summary.presenter';

export interface AssignmentDetailPresenter extends AssignmentListItemPresenter {
  metadata: unknown;
  lifecycle: AssignmentLifecycleSummaryPresenter;
}
