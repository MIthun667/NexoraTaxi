import { RetrievedContextCategory } from './retrieved-context-category.constants';

export interface RetrievedContext {
  contextId: string;
  contextType: string;
  contextCategory: RetrievedContextCategory;
  title: string;
  summary: string;
  sourceModule: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  organizationId?: string | null;
  payload: Record<string, unknown> | null;
  relatedContextIds: string[];
  collectedAt: Date;
  metadata?: Record<string, unknown> | null;
}
