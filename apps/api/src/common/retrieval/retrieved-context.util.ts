import { randomUUID } from 'crypto';

import { RetrievedContext } from './retrieved-context.interface';

export type RetrievedContextInput = Omit<RetrievedContext, 'contextId' | 'collectedAt'> & {
  contextId?: string;
  collectedAt?: Date;
};

export function buildRetrievedContext(input: RetrievedContextInput): RetrievedContext {
  return {
    contextId: input.contextId ?? randomUUID(),
    contextType: input.contextType,
    contextCategory: input.contextCategory,
    title: input.title,
    summary: input.summary,
    sourceModule: input.sourceModule,
    sourceEntityType: input.sourceEntityType ?? null,
    sourceEntityId: input.sourceEntityId ?? null,
    organizationId: input.organizationId ?? null,
    payload: input.payload ?? null,
    relatedContextIds: input.relatedContextIds ?? [],
    collectedAt: input.collectedAt ?? new Date(),
    metadata: input.metadata ?? null,
  };
}
