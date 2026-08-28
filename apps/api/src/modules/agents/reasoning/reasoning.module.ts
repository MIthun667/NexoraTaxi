import { Module } from '@nestjs/common';

import { GovernanceModule } from '../../governance/governance.module';
import { IntelligenceModule } from '../../intelligence/intelligence.module';
import { RetrievalModule } from '../../retrieval/retrieval.module';
import { AgentPolicyService } from '../agent-policy.service';
import { SkillsModule } from '../skills/skills.module';
import { DecisionValidatorService } from './decision-validator.service';
import { LlmRunnerService } from './llm-runner.service';
import { PolicyEvaluatorService } from './policy-evaluator.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ReasoningOrchestratorService } from './reasoning-orchestrator.service';
import { ReasoningService } from './reasoning.service';
import { ResponseParserService } from './response-parser.service';

@Module({
  imports: [RetrievalModule, IntelligenceModule, GovernanceModule, SkillsModule],
  providers: [
    PromptBuilderService,
    ResponseParserService,
    DecisionValidatorService,
    PolicyEvaluatorService,
    LlmRunnerService,
    ReasoningOrchestratorService,
    ReasoningService,
    AgentPolicyService,
  ],
  exports: [ReasoningService],
})
export class ReasoningModule {}
