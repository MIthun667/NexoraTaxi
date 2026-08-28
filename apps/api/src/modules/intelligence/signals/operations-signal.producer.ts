import { Injectable } from '@nestjs/common';

import { SignalCategory } from '../../../common/signals';
import { SignalProducer } from '../signals.types';

@Injectable()
export class OperationsSignalProducer implements SignalProducer {
  readonly key = 'operations.flow';
  readonly category = SignalCategory.operations;
  readonly description =
    'Starter registration for operational task, incident, and dispatch-to-operations signal producers over seeded operational data.';
  readonly supportsTenantScoping = true;
  readonly sourceModule = 'operations';

  // TODO(universal-signals): implement real operational flow and incident signal collection using operations, dispatch, and dashboard read paths.
}
