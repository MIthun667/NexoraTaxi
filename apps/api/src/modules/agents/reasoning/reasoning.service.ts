import { Injectable } from '@nestjs/common';

import { AgentReasoningResult } from './reasoning.types';
import { ReasoningOrchestratorService } from './reasoning-orchestrator.service';

@Injectable()
export class ReasoningService {
  constructor(private readonly reasoningOrchestratorService: ReasoningOrchestratorService) {}

  run(input: {
    agentDefinition: { id: string; code: string; name: string; category: string };
    agentRunId: string;
    organizationId: string;
    entityType?: string | null;
    entityId?: string | null;
    inputContext?: Record<string, unknown> | null;
  }): Promise<AgentReasoningResult> {
    return this.reasoningOrchestratorService.run(input);
  }
}
