import { Injectable } from '@nestjs/common';

import { VerificationRepository } from './verification.repository';

@Injectable()
export class EvaluationRecorderService {
  constructor(private readonly verificationRepository: VerificationRepository) {}

  record(params: {
    organizationId: string;
    agentRunId: string;
    metricName: string;
    metricValue: number;
    baselineValue?: number | null;
    deltaValue?: number | null;
    evaluationWindowStart: Date;
    evaluationWindowEnd: Date;
    summary: string;
  }) {
    return this.verificationRepository.createEvaluationResult({
      organizationId: params.organizationId,
      agentRun: { connect: { id: params.agentRunId } },
      metricName: params.metricName,
      metricValue: params.metricValue,
      baselineValue: params.baselineValue ?? null,
      deltaValue: params.deltaValue ?? null,
      evaluationWindowStart: params.evaluationWindowStart,
      evaluationWindowEnd: params.evaluationWindowEnd,
      summary: params.summary,
    });
  }
}
