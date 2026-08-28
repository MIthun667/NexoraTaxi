import { AssetListItemPresenter } from './asset-list-item.presenter';
import { AssetHistoryItemPresenter } from './asset-history-item.presenter';
import { MaintenanceRecordSummaryItemPresenter } from './maintenance-record-summary-item.presenter';

export interface AssetDetailPresenter extends AssetListItemPresenter {
  specifications: unknown;
  metadata: unknown;
  maintenanceSummary: MaintenanceRecordSummaryItemPresenter[];
  latestStatusChanges: AssetHistoryItemPresenter[];
  readiness: {
    isOperationallyReady: boolean;
    blockingIssues: string[];
  };
}
