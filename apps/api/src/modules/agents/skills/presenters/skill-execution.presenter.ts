import { AgentRiskLevel } from '@prisma/client';

import { AgentSkillCategory, SkillRecommendation } from '../skills.types';

export interface SkillExecutionPresenter {
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
}
