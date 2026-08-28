import { AgentVerificationStatus, AgentVerificationType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { VerificationOutcome, VerificationRequest } from './verification.types';

@Injectable()
export class ExecutionVerifierService {
  verify(request: VerificationRequest): VerificationOutcome {
    const executionStatus = String(request.executionResult?.executionStatus ?? 'UNKNOWN');
    const passed = executionStatus === 'SUCCEEDED';

    return {
      verificationType: AgentVerificationType.EXECUTION,
      verificationStatus: passed ? AgentVerificationStatus.PASSED : AgentVerificationStatus.FAILED,
      summary: passed
        ? `Action ${request.actionType} reported technical success.`
        : `Action ${request.actionType} did not report technical success.`,
      expectedState: (request.expectedState ?? null) as never,
      observedState: (request.executionResult ?? null) as never,
      details: {
        executionStatus,
      } as never,
    };
  }
}
