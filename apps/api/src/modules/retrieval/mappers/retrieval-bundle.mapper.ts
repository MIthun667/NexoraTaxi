import { RetrievalBundle, RetrievalProviderResult } from '../retrieval.types';

export function mergeRetrievalProviderResults(results: RetrievalProviderResult[]): RetrievalBundle {
  return results.reduce<RetrievalBundle>(
    (bundle, result) => ({
      entitySnapshot: bundle.entitySnapshot ?? result.entitySnapshot ?? null,
      relatedEntities: [...bundle.relatedEntities, ...(result.relatedEntities ?? [])],
      timelineEvents: [...bundle.timelineEvents, ...(result.timelineEvents ?? [])],
      operationalMetrics: [...bundle.operationalMetrics, ...(result.operationalMetrics ?? [])],
      riskSignals: [...bundle.riskSignals, ...(result.riskSignals ?? [])],
      contextNotes: [...bundle.contextNotes, ...(result.contextNotes ?? [])],
    }),
    {
      entitySnapshot: null,
      relatedEntities: [],
      timelineEvents: [],
      operationalMetrics: [],
      riskSignals: [],
      contextNotes: [],
    },
  );
}
