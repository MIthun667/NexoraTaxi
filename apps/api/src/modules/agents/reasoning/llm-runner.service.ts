import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InferenceStatus, Prisma } from '@prisma/client';

import { AiObservabilityService } from '../../governance/ai-observability.service';
import { OllamaClientService } from '../../intelligence/ollama-client.service';
import { InferenceAuditService } from '../../intelligence/inference-audit.service';
import { AgentPrompt, ReasoningContext } from './reasoning.types';

interface LlmRunnerResult {
  content: string;
  latencyMs: number;
  model: string;
  rawRequest: unknown;
  rawResponse: unknown;
}

@Injectable()
export class LlmRunnerService {
  constructor(
    private readonly ollamaClientService: OllamaClientService,
    private readonly inferenceAuditService: InferenceAuditService,
    private readonly aiObservabilityService: AiObservabilityService,
  ) {}

  async run(context: ReasoningContext, prompt: AgentPrompt): Promise<LlmRunnerResult> {
    let response: LlmRunnerResult | null = null;

    try {
      response = await this.ollamaClientService.chatJson({
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt },
        ],
      });

      await this.inferenceAuditService.record({
        agentRunId: context.agentRunId,
        actorUserId: null,
        inputSummary: this.inferenceAuditService.summarize(
          {
            agentDefinition: context.agentDefinition.code,
            agentRunId: context.agentRunId,
            entityType: context.entityType,
            entityId: context.entityId,
          },
          1500,
        ),
        latencyMs: response.latencyMs,
        model: response.model,
        moduleKey: 'agents.reasoning',
        organizationId: context.organizationId,
        outputSummary: this.inferenceAuditService.summarize(response.content, 1500),
        promptTemplateKey: 'agent-reasoning.v1',
        rawRequest: response.rawRequest as unknown as Prisma.InputJsonValue,
        rawResponse: response.rawResponse as unknown as Prisma.InputJsonValue,
        status: InferenceStatus.SUCCEEDED,
        useCase: 'agent_reasoning',
      });

      await this.aiObservabilityService.recordReasoningLatency({
        organizationId: context.organizationId,
        agentRunId: context.agentRunId,
        latencyMs: response.latencyMs,
        model: response.model,
      });

      return response;
    } catch (error) {
      await this.inferenceAuditService.record({
        agentRunId: context.agentRunId,
        actorUserId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown reasoning inference failure',
        inputSummary: this.inferenceAuditService.summarize(
          {
            agentDefinition: context.agentDefinition.code,
            agentRunId: context.agentRunId,
            entityType: context.entityType,
            entityId: context.entityId,
          },
          1500,
        ),
        latencyMs: response?.latencyMs ?? null,
        model: response?.model ?? 'unknown',
        moduleKey: 'agents.reasoning',
        organizationId: context.organizationId,
        promptTemplateKey: 'agent-reasoning.v1',
        rawRequest:
          (response?.rawRequest as unknown as Prisma.InputJsonValue | undefined) ?? undefined,
        rawResponse:
          (response?.rawResponse as unknown as Prisma.InputJsonValue | undefined) ?? undefined,
        status: InferenceStatus.FAILED,
        useCase: 'agent_reasoning',
      });

      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Agent reasoning runtime failed.',
      );
    }
  }
}
