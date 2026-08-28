import { AgentFeedbackSourceType, AgentFeedbackType } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { FeedbackCaptureRequest } from './verification.types';
import { VerificationRepository } from './verification.repository';

@Injectable()
export class FeedbackCaptureService {
  constructor(private readonly verificationRepository: VerificationRepository) {}

  capture(request: FeedbackCaptureRequest) {
    return this.verificationRepository.createFeedback({
      organizationId: request.organizationId,
      agentRun: { connect: { id: request.agentRunId } },
      sourceType: request.sourceType as AgentFeedbackSourceType,
      feedbackType: request.feedbackType as AgentFeedbackType,
      score: request.score ?? null,
      comment: request.comment ?? null,
      createdByUserId: request.createdByUserId ?? null,
    });
  }
}
