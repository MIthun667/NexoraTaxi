import { OperationalZoneListItemPresenter } from './operational-zone-list-item.presenter';

export interface OperationalZoneDetailPresenter extends OperationalZoneListItemPresenter {
  coverageDefinition: unknown;
  metadata: unknown;
  childZones: OperationalZoneListItemPresenter[];
}
