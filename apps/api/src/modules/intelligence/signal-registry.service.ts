import { Injectable } from '@nestjs/common';

import {
  SignalProducer,
  SignalProducerRegistration,
} from './signals.types';
import { BudgetVarianceAnomalyDetector } from './anomalies/budget-variance-anomaly.detector';
import { NoopAnomalyDetector } from './anomalies/noop-anomaly.detector';
import { StalledWorkflowAnomalyDetector } from './anomalies/stalled-workflow-anomaly.detector';
import { WorkforceAttendanceAnomalyDetector } from './anomalies/workforce-attendance-anomaly.detector';
import { OperationsSignalProducer } from './signals/operations-signal.producer';
import { WorkforceSignalProducer } from './signals/workforce-signal.producer';

@Injectable()
export class SignalRegistryService {
  private readonly producers = new Map<string, SignalProducer>();

  constructor(
    workforceSignalProducer: WorkforceSignalProducer,
    operationsSignalProducer: OperationsSignalProducer,
    noopAnomalyDetector: NoopAnomalyDetector,
    workforceAttendanceAnomalyDetector: WorkforceAttendanceAnomalyDetector,
    budgetVarianceAnomalyDetector: BudgetVarianceAnomalyDetector,
    stalledWorkflowAnomalyDetector: StalledWorkflowAnomalyDetector,
  ) {
    this.register(workforceSignalProducer);
    this.register(operationsSignalProducer);
    this.register(noopAnomalyDetector);
    this.register(workforceAttendanceAnomalyDetector);
    this.register(budgetVarianceAnomalyDetector);
    this.register(stalledWorkflowAnomalyDetector);
  }

  register(producer: SignalProducer) {
    this.producers.set(producer.key, producer);
  }

  list(): SignalProducerRegistration[] {
    return [...this.producers.values()].map((producer) => ({
      key: producer.key,
      category: producer.category,
      description: producer.description,
      supportsTenantScoping: producer.supportsTenantScoping,
      sourceModule: producer.sourceModule,
    }));
  }

  listByCategory(category: string): SignalProducerRegistration[] {
    return this.list().filter((producer) => producer.category === category);
  }

  get(key: string): SignalProducer | undefined {
    return this.producers.get(key);
  }
}
