import { BadRequestException, Injectable } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import {
  RETRIEVAL_DEFAULT_MAX_RECORDS,
  RETRIEVAL_DEFAULT_TIME_WINDOW_DAYS,
  RETRIEVAL_DEFAULT_TIMEOUT_MS,
  RETRIEVAL_HARD_MAX_RECORDS,
} from './retrieval.constants';
import { RetrievalBundle, RetrievalRequest } from './retrieval.types';

@Injectable()
export class RetrievalPoliciesService {
  normalizeRequest(request: RetrievalRequest, principal?: CurrentPrincipal): RetrievalRequest {
    const organizationId = request.organizationId ?? principal?.organizationId;

    if (!organizationId) {
      throw new BadRequestException('Retrieval requests require an organization scope.');
    }

    if (principal?.organizationId && principal.organizationId !== organizationId) {
      throw new BadRequestException('Cross-organization retrieval is not permitted.');
    }

    const maxRecords = Math.min(
      Math.max(request.maxRecords ?? RETRIEVAL_DEFAULT_MAX_RECORDS, 1),
      RETRIEVAL_HARD_MAX_RECORDS,
    );

    const to = request.timeWindow?.to ?? new Date();
    const from =
      request.timeWindow?.from ??
      new Date(to.getTime() - RETRIEVAL_DEFAULT_TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    return {
      ...request,
      organizationId,
      maxRecords,
      includeRelated: request.includeRelated ?? true,
      timeWindow: {
        from,
        to,
      },
    };
  }

  getTimeoutBudget(): number {
    return RETRIEVAL_DEFAULT_TIMEOUT_MS;
  }

  finalizeBundle(bundle: RetrievalBundle, request: RetrievalRequest): RetrievalBundle {
    return {
      ...bundle,
      relatedEntities: bundle.relatedEntities.slice(0, request.maxRecords ?? RETRIEVAL_DEFAULT_MAX_RECORDS),
      timelineEvents: bundle.timelineEvents
        .sort((left, right) => {
          const leftTime = new Date(String(left.occurredAt ?? left.createdAt ?? left.effectiveAt ?? 0)).getTime();
          const rightTime = new Date(String(right.occurredAt ?? right.createdAt ?? right.effectiveAt ?? 0)).getTime();
          return rightTime - leftTime;
        })
        .slice(0, request.maxRecords ?? RETRIEVAL_DEFAULT_MAX_RECORDS),
      contextNotes: [...new Set(bundle.contextNotes)],
    };
  }
}
