import { Injectable } from '@nestjs/common';

import { StructuredInferenceService } from './structured-inference.service';
import { executiveSummarySchema, type ExecutiveSummaryOutput } from './schemas/executive-summary.schema';

@Injectable()
export class AiLlmSummaryService {
  constructor(
    private readonly structuredInferenceService: StructuredInferenceService,
  ) {}

  generateExecutiveSummary(input: {
    organizationId: string;
    actorUserId?: string | null;
    context: unknown;
  }): Promise<ExecutiveSummaryOutput> {
    return this.structuredInferenceService.generate({
      actorUserId: input.actorUserId ?? null,
      context: input.context,
      organizationId: input.organizationId,
      schema: executiveSummarySchema,
      templateKey: 'shopify-executive-summary.v1',
    });
  }
}
