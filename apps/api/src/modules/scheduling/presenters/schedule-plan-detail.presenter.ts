import { SchedulePlanListItemPresenter } from './schedule-plan-list-item.presenter';
import { ScheduleShiftListItemPresenter } from './schedule-shift-list-item.presenter';

export interface SchedulePlanDetailPresenter extends SchedulePlanListItemPresenter {
  metadata: unknown;
  shifts: ScheduleShiftListItemPresenter[];
}
