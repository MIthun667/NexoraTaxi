import { RegisteredEntityCategory } from './registered-entity-category.constants';
import { RegisteredEntityType } from './registered-entity-type.constants';

export interface RegisteredEntity {
  registryId: string;
  entityType: RegisteredEntityType;
  entityCategory: RegisteredEntityCategory;
  entityId: string;
  displayName: string;
  sourceModule: string;
  organizationId?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  registeredAt: Date;
}
