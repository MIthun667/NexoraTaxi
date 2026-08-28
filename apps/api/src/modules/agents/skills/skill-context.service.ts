import { Injectable } from '@nestjs/common';

import { RetrievalBundle } from '../../retrieval/retrieval.types';
import { AgentSkillContext } from './skills.types';

@Injectable()
export class SkillContextService {
  countRelatedEntities(bundle: RetrievalBundle, entityType: string): number {
    return bundle.relatedEntities.filter((entity) => entity.entityType === entityType).length;
  }

  findMetric(bundle: RetrievalBundle, key: string): number {
    const metric = bundle.operationalMetrics.find((entry) => entry.key === key);
    return typeof metric?.value === 'number' ? metric.value : 0;
  }

  hasRiskSignal(bundle: RetrievalBundle, code: string): boolean {
    return bundle.riskSignals.some((signal) => signal.code === code);
  }

  getRiskMessages(bundle: RetrievalBundle): string[] {
    return bundle.riskSignals.map((signal) => signal.message);
  }

  getTimelineCount(bundle: RetrievalBundle, eventType: string): number {
    return bundle.timelineEvents.filter((event) => event.eventType === eventType).length;
  }

  getEntitySnapshotValue<T = unknown>(context: AgentSkillContext, key: string): T | undefined {
    return context.retrievalBundle.entitySnapshot?.[key] as T | undefined;
  }

  summarizeBundle(context: AgentSkillContext) {
    return {
      relatedEntityCount: context.retrievalBundle.relatedEntities.length,
      timelineCount: context.retrievalBundle.timelineEvents.length,
      metricCount: context.retrievalBundle.operationalMetrics.length,
      riskSignalCount: context.retrievalBundle.riskSignals.length,
    };
  }
}
