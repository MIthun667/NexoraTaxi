import { Injectable } from '@nestjs/common';
import { InferenceStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateInferenceAuditLogInput {
  agentRunId?: null | string;
  actorUserId?: null | string;
  errorMessage?: null | string;
  inputSummary: string;
  latencyMs?: null | number;
  model: string;
  moduleKey: string;
  organizationId?: null | string;
  outputSummary?: null | string;
  promptTemplateKey: string;
  rawRequest?: Prisma.InputJsonValue;
  rawResponse?: Prisma.InputJsonValue;
  status: InferenceStatus;
  useCase: string;
}

@Injectable()
export class InferenceAuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async record(input: CreateInferenceAuditLogInput) {
    return this.prismaService.inferenceAuditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        agentRunId: input.agentRunId ?? null,
        errorMessage: input.errorMessage ? this.limit(input.errorMessage, 500) : null,
        inputSummary: this.limit(input.inputSummary, 2000),
        latencyMs: input.latencyMs ?? null,
        model: input.model,
        moduleKey: input.moduleKey,
        organizationId: input.organizationId ?? null,
        outputSummary: input.outputSummary ? this.limit(input.outputSummary, 2000) : null,
        promptTemplateKey: input.promptTemplateKey,
        rawRequest: input.rawRequest,
        rawResponse: input.rawResponse,
        status: input.status,
        useCase: input.useCase,
      },
    });
  }

  summarize(value: unknown, limit = 500) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return this.limit(serialized, limit);
  }

  private limit(value: string, maxLength: number) {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
  }
}
