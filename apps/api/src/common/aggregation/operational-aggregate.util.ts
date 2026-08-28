import { randomUUID } from 'crypto';

import { CanonicalSignal } from '../signals';
import { RetrievedContext } from '../retrieval';
import { OperationalAggregate } from './operational-aggregate.interface';

export type OperationalAggregateInput = Omit<
  OperationalAggregate,
  'aggregateId' | 'assembledAt'
> & {
  aggregateId?: string;
  assembledAt?: Date;
};

export function buildOperationalAggregate(
  input: OperationalAggregateInput,
): OperationalAggregate {
  return {
    aggregateId: input.aggregateId ?? randomUUID(),
    aggregateType: input.aggregateType,
    aggregateCategory: input.aggregateCategory,
    title: input.title,
    summary: input.summary,
    organizationId: input.organizationId ?? null,
    primaryEntityType: input.primaryEntityType ?? null,
    primaryEntityId: input.primaryEntityId ?? null,
    people: input.people ?? [],
    assets: input.assets ?? [],
    operationalTasks: input.operationalTasks ?? [],
    workflows: input.workflows ?? [],
    approvals: input.approvals ?? [],
    signals: input.signals ?? ([] as CanonicalSignal[]),
    metadata: input.metadata ?? null,
    assembledAt: input.assembledAt ?? new Date(),
  };
}
