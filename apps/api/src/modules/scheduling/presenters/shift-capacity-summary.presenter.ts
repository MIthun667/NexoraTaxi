export interface ShiftCapacitySummaryPresenter {
  capacityRequired: number | null;
  capacityAllocated: number | null;
  assignedCount: number;
  remainingCapacity: number | null;
  isOverCapacity: boolean;
  isUnderstaffed: boolean;
}
