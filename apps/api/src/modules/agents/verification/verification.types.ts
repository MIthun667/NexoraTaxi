import { AgentRunStatus, AgentVerificationStatus, AgentVerificationType, Prisma } from '@prisma/client';

export interface VerificationRequest {
  organizationId: string;
  agentRunId: string;
  actionProposalId?: string | null;
  actionExecutionLogId?: string | null;
  actionType: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  expectedState?: Record<string, unknown> | null;
  executionResult?: Record<string, unknown> | null;
}

export interface VerificationOutcome {
  verificationType: AgentVerificationType;
  verificationStatus: AgentVerificationStatus;
  summary: string;
  expectedState?: Prisma.InputJsonValue;
  observedState?: Prisma.InputJsonValue;
  details?: Prisma.InputJsonValue;
}

export interface OutcomeEvaluationRequest {
  organizationId: string;
  agentRunId: string;
  actionType: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
}

export interface FeedbackCaptureRequest {
  organizationId: string;
  agentRunId: string;
  sourceType: 'HUMAN' | 'SYSTEM';
  feedbackType: 'USEFUL' | 'NOT_USEFUL' | 'OVERRIDE' | 'CORRECTION' | 'RATING';
  score?: number | null;
  comment?: string | null;
  createdByUserId?: string | null;
}

export interface RunFinalizationResult {
  finalStatus: AgentRunStatus;
  verificationSummary: string;
  verificationResults: VerificationOutcome[];
}
