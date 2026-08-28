import { randomUUID } from 'crypto';

import { RegisteredEntity } from './registered-entity.interface';

export type RegisteredEntityInput = Omit<
  RegisteredEntity,
  'registryId' | 'registeredAt'
> & {
  registryId?: string;
  registeredAt?: Date;
};

export function buildRegisteredEntity(
  input: RegisteredEntityInput,
): RegisteredEntity {
  return {
    registryId: input.registryId ?? randomUUID(),
    entityType: input.entityType,
    entityCategory: input.entityCategory,
    entityId: input.entityId,
    displayName: input.displayName,
    sourceModule: input.sourceModule,
    organizationId: input.organizationId ?? null,
    status: input.status ?? null,
    metadata: input.metadata ?? null,
    registeredAt: input.registeredAt ?? new Date(),
  };
}
