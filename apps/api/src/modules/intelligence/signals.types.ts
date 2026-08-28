import { CanonicalSignal } from '../../common/signals';

export interface SignalProducerContext {
  organizationId?: string | null;
}

export interface SignalProducerRegistration {
  key: string;
  category: string;
  description: string;
  supportsTenantScoping: boolean;
  sourceModule: string;
}

export interface SignalProducer {
  readonly key: string;
  readonly category: string;
  readonly description: string;
  readonly supportsTenantScoping: boolean;
  readonly sourceModule: string;
  collect?(context: SignalProducerContext): Promise<CanonicalSignal[]>;
}
