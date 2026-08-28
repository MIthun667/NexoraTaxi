import { AgentConfidenceLevel, AgentDecisionType, AgentObservationType, AgentRiskLevel, Prisma } from '@prisma/client';

import { RetrievalBundle } from '../../retrieval/retrieval.types';
import { SkillExecutionResult } from '../skills/skills.types';

export interface ReasoningContext {
  agentDefinition: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
  agentRunId: string;
  organizationId: string;
  entityType?: string | null;
  entityId?: string | null;
  retrievalBundle: RetrievalBundle;
  skillResults?: SkillExecutionResult[];
  inputContext?: Record<string, unknown> | null;
}

export interface AgentPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export interface AgentRecommendation {
  action_type: string;
  summary: string;
  target_entity_type?: string | null;
  target_entity_id?: string | null;
  rationale?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface AgentReasoningOutput {
  summary: string;
  risk_level: AgentRiskLevel;
  findings: string[];
  recommended_actions: AgentRecommendation[];
  confidence: number;
}

export interface DecisionValidationResult {
  isValid: boolean;
  normalizedOutput: AgentReasoningOutput;
  warnings: string[];
}

export interface ActionProposalRequest {
  actionType: string;
  summary: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  payload?: Prisma.InputJsonValue;
}

export interface AgentReasoningResult {
  summary: string;
  observations: Array<{
    observationType: AgentObservationType;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  }>;
  decisions: Array<{
    decisionType: AgentDecisionType;
    summary: string;
    rationale?: string | null;
    confidence: AgentConfidenceLevel;
    metadata?: Prisma.InputJsonValue;
  }>;
  proposals: ActionProposalRequest[];
}
