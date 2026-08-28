import { WorkforceListItemPresenter } from './workforce-list-item.presenter';
import { WorkforceHistoryItemPresenter } from './workforce-history-item.presenter';
import { CredentialSummaryItemPresenter } from './credential-summary-item.presenter';

export interface WorkforceReadinessPresenter {
  isOperationallyReady: boolean;
  hasExpiringCredentials: boolean;
  blockingIssues: string[];
}

export interface WorkforceDetailPresenter extends WorkforceListItemPresenter {
  employeeId: string | null;
  userId: string | null;
  employmentModel: string | null;
  phoneNumber: string | null;
  skills: unknown;
  metadata: unknown;
  credentialSummary: CredentialSummaryItemPresenter[];
  latestStatusChanges: WorkforceHistoryItemPresenter[];
  readiness: WorkforceReadinessPresenter;
}
