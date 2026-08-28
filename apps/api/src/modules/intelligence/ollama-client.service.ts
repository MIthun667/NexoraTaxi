import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';

interface OllamaMessage {
  content: string;
  role: 'system' | 'user' | 'assistant';
}

interface OllamaChatRequest {
  format?: 'json';
  messages: OllamaMessage[];
  model?: string;
}

interface OllamaChatResponse {
  done?: boolean;
  message?: {
    content?: string;
    role?: string;
  };
  model?: string;
}

@Injectable()
export class OllamaClientService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async chatJson(input: OllamaChatRequest) {
    const timeoutMs = this.configService.get<number>('environment.ollamaTimeoutMs', 15000);
    const maxRetries = this.configService.get<number>('environment.ollamaMaxRetries', 2);
    const model = input.model ?? this.getModel();
    const requestBody = {
      model,
      messages: input.messages,
      stream: false,
      format: input.format ?? 'json',
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const startedAt = Date.now();
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMs);

      try {
        const response = await fetch(`${this.getBaseUrl()}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new BadGatewayException('The local intelligence runtime returned an invalid response.');
        }

        const parsed = (await response.json()) as OllamaChatResponse;
        const content = parsed.message?.content?.trim();

        if (!content) {
          throw new BadGatewayException('The local intelligence runtime returned an empty response.');
        }

        return {
          content,
          latencyMs: Date.now() - startedAt,
          model: parsed.model ?? model,
          rawResponse: parsed,
          rawRequest: requestBody,
        };
      } catch (error) {
        clearTimeout(timeout);
        lastError = error instanceof Error ? error : new Error('Unknown Ollama client failure');

        const isAbort = error instanceof DOMException && error.name === 'AbortError';
        const isLastAttempt = attempt === maxRetries;

        if (!isLastAttempt) {
          this.logger.warn({
            event: 'intelligence.ollama.retry',
            attempt: attempt + 1,
            model,
            reason: lastError.message,
          });
          continue;
        }

        if (isAbort) {
          throw new GatewayTimeoutException(
            'The local intelligence runtime did not respond within the configured timeout.',
          );
        }

        if (error instanceof BadGatewayException) {
          throw error;
        }

        throw new ServiceUnavailableException(
          'The local intelligence runtime is currently unavailable.',
        );
      }
    }

    throw new ServiceUnavailableException(
      lastError?.message ?? 'The local intelligence runtime is currently unavailable.',
    );
  }

  async checkHealth() {
    const abortController = new AbortController();
    const timeoutMs = this.configService.get<number>('environment.ollamaTimeoutMs', 15000);
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/tags`, {
        method: 'GET',
        signal: abortController.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new ServiceUnavailableException('The local intelligence runtime is not healthy.');
      }

      const payload = (await response.json()) as { models?: Array<{ name?: string }> };
      return {
        configuredModel: this.getModel(),
        models: (payload.models ?? []).map((model) => model.name).filter(Boolean),
        status: 'healthy',
      };
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof GatewayTimeoutException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GatewayTimeoutException(
          'The local intelligence runtime health check timed out.',
        );
      }

      throw new ServiceUnavailableException('The local intelligence runtime is not reachable.');
    }
  }

  private getBaseUrl() {
    return this.configService.get<string>('environment.ollamaBaseUrl', 'http://localhost:11434');
  }

  private getModel() {
    return this.configService.get<string>('environment.ollamaModel', 'qwen2.5:7b-instruct');
  }
}
