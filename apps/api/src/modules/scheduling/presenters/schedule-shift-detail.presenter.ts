import { ScheduleShiftListItemPresenter } from './schedule-shift-list-item.presenter';
import { ShiftCapacitySummaryPresenter } from './shift-capacity-summary.presenter';

export interface ScheduleShiftDetailPresenter extends ScheduleShiftListItemPresenter {
  metadata: unknown;
  capacitySummary: ShiftCapacitySummaryPresenter;
}
