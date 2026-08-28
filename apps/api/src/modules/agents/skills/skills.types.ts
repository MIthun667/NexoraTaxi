import { AgentRiskLevel } from '@prisma/client';

import { RetrievalBundle } from '../../retrieval/retrieval.types';

export type AgentSkillCategory =
  | 'OBSERVATION'
  | 'ANALYSIS'
  | 'DECISION_SUPPORT'
  | 'RECOMMENDATION'
  | 'COMMUNICATION'
  | 'VERIFICATION';

export interface SkillRecommendation {
  actionType: string;
  summary: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  rationale?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface AgentSkillContext {
  organizationId: string;
  agentRunId: string;
  agentDefinition: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
  entityType?: string | null;
  entityId?: string | null;
  retrievalBundle: RetrievalBundle;
  inputContext?: Record<string, unknown> | null;
}

export interface SkillExecutionRequest {
  skillIds?: string[];
  context: AgentSkillContext;
}

export interface SkillExecutionResult {
  skillId: string;
  skillName: string;
  category: AgentSkillCategory;
  summary: string;
  findings: string[];
  metrics: Array<{
    key: string;
    label: string;
    value: number | string | boolean | null;
    unit?: string | null;
  }>;
  riskLevel: AgentRiskLevel;
  recommendations: SkillRecommendation[];
  evidence?: Record<string, unknown> | null;
}

export interface SkillValidationResult {
  isValid: boolean;
  reasons: string[];
}

export interface SkillRegistryEntry {
  id: string;
  name: string;
  category: AgentSkillCategory;
  supportedEntityTypes?: string[];
  supportedAgentCodes?: string[];
  priority: number;
}

export interface AgentSkill {
  readonly id: string;
  readonly name: string;
  readonly category: AgentSkillCategory;
  readonly priority: number;
  supports(context: AgentSkillContext): boolean;
  validate(context: AgentSkillContext): SkillValidationResult;
  execute(context: AgentSkillContext): Promise<SkillExecutionResult>;
}
