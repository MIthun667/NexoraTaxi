import { buildSignal, CanonicalSignal, SignalStatus } from '../../common/signals';
import {
  AnomalyEvaluationContext,
  AnomalyEvaluationResult,
} from './anomalies.types';
import { SignalProducer } from './signals.types';

export abstract class BaseAnomalyDetector implements SignalProducer {
  abstract readonly key: string;
  abstract readonly category: string;
  abstract readonly description: string;
  abstract readonly supportsTenantScoping: boolean;
  abstract readonly sourceModule: string;

  async collect(context: AnomalyEvaluationContext): Promise<CanonicalSignal[]> {
    const result = await this.evaluate(context);
    return result.signals;
  }

  protected buildSignal(input: {
    signalType: string;
    title: string;
    summary: string;
    severity: string;
    entityType?: string | null;
    entityId?: string | null;
    relatedEntityIds?: string[] | null;
    organizationId?: string | null;
    evidence?: Record<string, unknown> | null;
    metrics?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }) {
    return buildSignal({
      signalType: input.signalType,
      signalCategory: this.category,
      title: input.title,
      summary: input.summary,
      severity: input.severity,
      status: SignalStatus.open,
      sourceModule: this.sourceModule,
      sourceSystem: 'anomaly-detector',
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      relatedEntityIds: input.relatedEntityIds ?? null,
      organizationId: input.organizationId ?? null,
      evidence: input.evidence ?? null,
      metrics: input.metrics ?? null,
      metadata: {
        detectorKey: this.key,
        ...(input.metadata ?? {}),
      },
    });
  }

  abstract evaluate(
    context: AnomalyEvaluationContext,
  ): Promise<AnomalyEvaluationResult>;
}
