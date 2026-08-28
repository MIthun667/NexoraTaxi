import { Injectable } from '@nestjs/common';

import { RequestContextStorage } from '../../common/utils/request-context.util';
import { TraceContext } from './observability.types';

@Injectable()
export class TracingService {
  getCurrentTrace(organizationId?: string | null): TraceContext {
    const store = RequestContextStorage.get();

    return {
      requestId: store?.requestId ?? null,
      correlationId: store?.requestId ?? null,
      organizationId: organizationId ?? store?.request?.principal?.organizationId ?? store?.request?.user?.organizationId ?? null,
      startedAt: store?.startedAt ?? null,
    };
  }
}
