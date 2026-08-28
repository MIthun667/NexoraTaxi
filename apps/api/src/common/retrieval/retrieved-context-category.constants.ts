export const RETRIEVED_CONTEXT_CATEGORIES = [
  'people',
  'assets',
  'operations',
  'workflows',
  'approvals',
  'system',
] as const;

export type RetrievedContextCategory = (typeof RETRIEVED_CONTEXT_CATEGORIES)[number];
