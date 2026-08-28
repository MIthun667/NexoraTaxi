import { Injectable } from '@nestjs/common';

import { SignalCategory } from '../../../common/signals';
import { BaseAnomalyDetector } from '../base-anomaly-detector';
import {
  AnomalyEvaluationContext,
  AnomalyEvaluationResult,
} from '../anomalies.types';

@Injectable()
export class NoopAnomalyDetector extends BaseAnomalyDetector {
  readonly key = 'system.noop-anomaly';
  readonly category = SignalCategory.system;
  readonly description =
    'Starter anomaly detector scaffold that returns no findings and exists only to demonstrate the reusable base pattern.';
  readonly supportsTenantScoping = true;
  readonly sourceModule = 'intelligence';

  // TODO(universal-anomalies): add more real anomaly detectors such as asset readiness anomalies, approval load concentration anomalies, and cross-domain workflow health anomalies beyond the current attendance, spend, and stalled-flow detectors.
  async evaluate(
    _context: AnomalyEvaluationContext,
  ): Promise<AnomalyEvaluationResult> {
    return {
      signals: [],
      evidence: null,
      metrics: null,
      thresholds: [],
    };
  }
}
