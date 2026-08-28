import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InferenceStatus, Prisma } from '@prisma/client';
import { z, ZodType } from 'zod';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { InferenceAuditService } from './inference-audit.service';
import { OllamaClientService } from './ollama-client.service';
import { PromptTemplateService } from './prompt-template.service';

interface StructuredInferenceInput<TSchema extends ZodType> {
  actorUserId?: null | string;
  context: unknown;
  organizationId?: null | string;
  schema: TSchema;
  templateKey: string;
}

@Injectable()
export class StructuredInferenceService {
  constructor(
    private readonly promptTemplateService: PromptTemplateService,
    private readonly ollamaClientService: OllamaClientService,
    private readonly inferenceAuditService: InferenceAuditService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async generate<TSchema extends ZodType>({
    actorUserId,
    context,
    organizationId,
    schema,
    templateKey,
  }: StructuredInferenceInput<TSchema>): Promise<z.infer<TSchema>> {
    const template = this.promptTemplateService.getTemplate(templateKey);
    const baseMessages = [
      { role: 'system' as const, content: template.systemPrompt },
      { role: 'user' as const, content: template.renderUserPrompt(context) },
    ];

    let validationErrorMessage = '';
    let rawRequest: Prisma.InputJsonValue | undefined;
    let rawResponse: Prisma.InputJsonValue | undefined;
    let model = '';
    let latencyMs = 0;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const messages =
        attempt === 0
          ? baseMessages
          : [
              ...baseMessages,
              {
                role: 'user' as const,
                content:
                  'Your previous response did not match the required JSON schema. Return only a valid JSON object with all required fields and no extra text.',
              },
            ];

      try {
        const response = await this.ollamaClientService.chatJson({
          messages,
        });

        rawRequest = response.rawRequest as unknown as Prisma.InputJsonValue;
        rawResponse = response.rawResponse as unknown as Prisma.InputJsonValue;
        model = response.model;
        latencyMs = response.latencyMs;

        const parsedJson = this.parseJson(response.content);
        const validated = schema.safeParse(parsedJson);

        if (!validated.success) {
          validationErrorMessage = validated.error.issues
            .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
            .join('; ');

          if (attempt === 0) {
            continue;
          }

          await this.inferenceAuditService.record({
            actorUserId,
            errorMessage: validationErrorMessage,
            inputSummary: this.inferenceAuditService.summarize(context, 1500),
            latencyMs,
            model,
            moduleKey: template.moduleKey,
            organizationId,
            outputSummary: this.inferenceAuditService.summarize(parsedJson, 1500),
            promptTemplateKey: template.promptTemplateKey,
            rawRequest,
            rawResponse,
            status: InferenceStatus.VALIDATION_FAILED,
            useCase: template.useCase,
          });

          throw new BadGatewayException(
            'The intelligence runtime returned an invalid structured response.',
          );
        }

        await this.inferenceAuditService.record({
          actorUserId,
          inputSummary: this.inferenceAuditService.summarize(context, 1500),
          latencyMs,
          model,
          moduleKey: template.moduleKey,
          organizationId,
          outputSummary: this.inferenceAuditService.summarize(validated.data, 1500),
          promptTemplateKey: template.promptTemplateKey,
          rawRequest,
          rawResponse,
          status: InferenceStatus.SUCCEEDED,
          useCase: template.useCase,
        });

        return validated.data;
      } catch (error) {
        if (
          error instanceof BadGatewayException &&
          validationErrorMessage &&
          attempt === 0
        ) {
          continue;
        }

        const status =
          error instanceof GatewayTimeoutException
            ? InferenceStatus.TIMEOUT
            : error instanceof BadGatewayException
              ? InferenceStatus.VALIDATION_FAILED
              : InferenceStatus.FAILED;

        await this.inferenceAuditService.record({
          actorUserId,
          errorMessage: error instanceof Error ? error.message : 'Unknown intelligence failure',
          inputSummary: this.inferenceAuditService.summarize(context, 1500),
          latencyMs: latencyMs || null,
          model: model || 'unknown',
          moduleKey: template.moduleKey,
          organizationId,
          promptTemplateKey: template.promptTemplateKey,
          rawRequest,
          rawResponse,
          status,
          useCase: template.useCase,
        });

        this.logger.warn({
          event: 'intelligence.inference.failed',
          moduleKey: template.moduleKey,
          promptTemplateKey: template.promptTemplateKey,
          reason: error instanceof Error ? error.message : 'Unknown intelligence failure',
          status,
        });

        if (
          error instanceof BadGatewayException ||
          error instanceof GatewayTimeoutException ||
          error instanceof ServiceUnavailableException
        ) {
          throw error;
        }

        throw new ServiceUnavailableException(
          'The intelligence runtime could not complete the request.',
        );
      }
    }

    throw new BadGatewayException('The intelligence runtime returned an invalid structured response.');
  }

  private parseJson(content: string) {
    const normalized = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(normalized) as unknown;
  }
}
