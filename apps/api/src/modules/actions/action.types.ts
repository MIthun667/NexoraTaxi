import { ActionExecutionStatus, AgentRiskLevel, Prisma } from '@prisma/client';

import { CanonicalActionProposal } from '../../common/actions';

export interface ActionExecutionContext {
  organizationId: string;
  proposalId: string;
  actorUserId?: string | null;
  approvalRequestId?: string | null;
  correlationId?: string | null;
}

export interface ActionExecutionRequest {
  actionType: string;
  proposalId: string;
  organizationId: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  payload?: Record<string, unknown> | null;
  summary: string;
  idempotencyKey: string;
}

export interface ActionExecutionResult {
  success: boolean;
  executionStatus: ActionExecutionStatus;
  resultSummary: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

export interface ActionPolicyResult {
  allowed: boolean;
  requiresApproval: boolean;
  effectiveRisk: AgentRiskLevel;
  reasons: string[];
}

export interface ActionHandler {
  supportedActionTypes(): string[];
  execute(
    request: ActionExecutionRequest,
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult>;
}

export interface ActionProposalRecord {
  id: string;
  agentRunId: string;
  actionType: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  status: string;
  summary: string;
  payload: Prisma.JsonValue;
  riskLevel: AgentRiskLevel;
  requiresApproval: boolean;
  createdAt: Date;
  agentRun: {
    id: string;
    organizationId?: string | null;
    triggeredByUserId?: string | null;
    agentDefinition: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export type CanonicalActionProposalRecord = CanonicalActionProposal;
