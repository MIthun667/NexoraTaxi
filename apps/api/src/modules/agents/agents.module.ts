import { Module, forwardRef } from '@nestjs/common';

import { GovernanceModule } from '../governance/governance.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { ReportsModule } from '../reports/reports.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { VerificationModule } from './verification/verification.module';
import { ReasoningModule } from './reasoning/reasoning.module';
import { AiAgentsController } from './ai-agents.controller';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentContextService } from './agent-context.service';
import { CommerceAgentContextService } from './commerce-agent-context.service';
import { CommerceAgentOrchestrationService } from './commerce-agent-orchestration.service';
import { CommerceAgentsController } from './commerce-agents.controller';
import { AgentHistoryService } from './agent-history.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRunnerService } from './agent-runner.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { AgentExecutionService } from './execution.service';
import { CommerceHealthAgent } from './commerce-health.agent';
import { RevenueMonitorAgent } from './revenue-monitor.agent';
import { CustomerMomentumAgent } from './customer-momentum.agent';
import { IntegrationGuardAgent } from './integration-guard.agent';

@Module({
  imports: [forwardRef(() => IntelligenceModule), RetrievalModule, ReasoningModule, GovernanceModule, ReportsModule, TenancyModule, ObservabilityModule, VerificationModule],
  controllers: [AgentsController, CommerceAgentsController, AiAgentsController],
  providers: [
    AgentsService,
    AgentContextService,
    CommerceAgentContextService,
    CommerceAgentOrchestrationService,
    AgentHistoryService,
    AgentPolicyService,
    AgentRegistryService,
    AgentRunnerService,
    AgentRuntimeService,
    AgentExecutionService,
    CommerceHealthAgent,
    RevenueMonitorAgent,
    CustomerMomentumAgent,
    IntegrationGuardAgent,
  ],
  exports: [
    AgentsService,
    AgentPolicyService,
    AgentRuntimeService,
    AgentExecutionService,
    CommerceAgentOrchestrationService,
  ],
})
export class AgentsModule {}
