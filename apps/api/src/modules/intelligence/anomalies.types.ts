import { CanonicalSignal } from '../../common/signals';
import { SignalProducerContext } from './signals.types';

export interface AnomalyEvaluationContext extends SignalProducerContext {
  detectorKey: string;
}

export interface AnomalyThresholdMetadata {
  key: string;
  label: string;
  value: number | string | boolean | null;
  unit?: string | null;
}

export interface AnomalyEvaluationResult {
  signals: CanonicalSignal[];
  evidence?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  thresholds?: AnomalyThresholdMetadata[];
}
