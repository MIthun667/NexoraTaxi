import { CanonicalSignal } from '../signals';
import { RetrievedContext } from '../retrieval';
import { OperationalAggregateCategory } from './operational-aggregate-category.constants';

export interface OperationalAggregate {
  aggregateId: string;
  aggregateType: string;
  aggregateCategory: OperationalAggregateCategory;
  title: string;
  summary: string;
  organizationId?: string | null;
  primaryEntityType?: string | null;
  primaryEntityId?: string | null;
  people: RetrievedContext[];
  assets: RetrievedContext[];
  operationalTasks: RetrievedContext[];
  workflows: RetrievedContext[];
  approvals: RetrievedContext[];
  signals: CanonicalSignal[];
  metadata?: Record<string, unknown> | null;
  assembledAt: Date;
}
