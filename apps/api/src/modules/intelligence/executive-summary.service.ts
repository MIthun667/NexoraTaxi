import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { OllamaClientService } from './ollama-client.service';
import {
  IntelligenceContext,
  IntelligenceInsight,
  IntelligenceRecommendation,
} from './intelligence.types';

@Injectable()
export class ExecutiveSummaryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaClientService: OllamaClientService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async generateSummary(
    context: IntelligenceContext,
    insights: IntelligenceInsight[],
    recommendations: IntelligenceRecommendation[],
  ) {
    const deterministicSummary = this.buildDeterministicSummary(
      context,
      insights,
      recommendations,
    );
    const rephrased = await this.tryRephraseSummary(deterministicSummary);

    if (!rephrased) {
      return {
        summary: deterministicSummary,
        sourceType: 'deterministic' as const,
        modelName: null,
      };
    }

    return {
      summary: rephrased.summary,
      sourceType: 'ai_rephrased' as const,
      modelName: rephrased.modelName,
    };
  }

  private buildDeterministicSummary(
    context: IntelligenceContext,
    insights: IntelligenceInsight[],
    recommendations: IntelligenceRecommendation[],
  ) {
    if (context.productsCount === 0) {
      return 'Nexora is awaiting Shopify product data. Commerce intelligence will activate after the first successful product sync.';
    }

    if (!context.hasOrderAccess || !context.hasCustomerAccess) {
      const financeSentence = context.hasStripe
        ? 'Stripe is connected for payment validation, but full commerce coverage is still incomplete.'
        : 'Refund and payment behavior cannot be validated because Stripe is not connected.';

      return `Nexora is operating in limited intelligence mode. Product visibility is active across ${context.productsCount} synced products, but order and customer data are restricted. Revenue and retention insights are therefore incomplete. ${financeSentence}`;
    }

    const commerceSentence = `Shopify has ${context.productsCount} synced products and reported ${context.ordersToday ?? 0} orders today${context.revenueToday !== undefined ? `, producing ${this.formatCurrency(context.revenueToday)}` : ''}.`;
    const customerSentence =
      context.newCustomers !== undefined
        ? `${context.newCustomers} new customer${context.newCustomers === 1 ? '' : 's'} were recorded today.`
        : 'Customer activity is available for analysis.';
    const financeSentence = context.hasStripe
      ? 'Stripe payment visibility is active.'
      : 'Stripe is not connected, so refund visibility remains incomplete.';
    const actionSentence = recommendations[0]
      ? `Priority action: ${recommendations[0].title.toLowerCase()}.`
      : insights[0]
        ? `Current lead insight: ${insights[0].title.toLowerCase()}.`
        : 'No immediate action is required.';

    return `${commerceSentence} ${customerSentence} ${financeSentence} ${actionSentence}`;
  }

  private async tryRephraseSummary(summary: string) {
    const ollamaBaseUrl = this.configService.get<string>(
      'environment.ollamaBaseUrl',
      'http://localhost:11434',
    );

    if (!ollamaBaseUrl) {
      return null;
    }

    try {
      const response = await this.ollamaClientService.chatJson({
        messages: [
          {
            role: 'system',
            content:
              'Rewrite the provided executive summary for concise enterprise tone. Keep all facts, uncertainty, scope, and numbers identical. Do not add or remove facts. Return JSON: {"summary":"..."}',
          },
          {
            role: 'user',
            content: JSON.stringify({ summary }),
          },
        ],
      });

      const parsed = JSON.parse(response.content) as { summary?: unknown };
      if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
        return null;
      }

      return {
        summary: parsed.summary.trim(),
        modelName: response.model,
      };
    } catch (error) {
      this.logger.warn({
        event: 'intelligence.executive_summary.rephrase_skipped',
        reason: error instanceof Error ? error.message : 'Unknown rephrase failure',
      });

      return null;
    }
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }
}
