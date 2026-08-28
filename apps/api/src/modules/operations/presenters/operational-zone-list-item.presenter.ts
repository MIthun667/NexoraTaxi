import { OperationalZoneType } from '@prisma/client';

export interface OperationalZoneListItemPresenter {
  id: string;
  organizationId: string;
  zoneCode: string;
  name: string;
  zoneType: OperationalZoneType;
  description: string | null;
  parentZoneId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
