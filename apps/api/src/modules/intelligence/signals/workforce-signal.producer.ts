import { Injectable } from '@nestjs/common';

import { SignalCategory } from '../../../common/signals';
import { SignalProducer } from '../signals.types';

@Injectable()
export class WorkforceSignalProducer implements SignalProducer {
  readonly key = 'workforce.readiness';
  readonly category = SignalCategory.people;
  readonly description =
    'Starter registration for workforce and people readiness signals derived from seeded operational records.';
  readonly supportsTenantScoping = true;
  readonly sourceModule = 'workforce';

  // TODO(universal-signals): implement real seeded-data-backed signal collection using workforce readiness and compliance read models.
}
