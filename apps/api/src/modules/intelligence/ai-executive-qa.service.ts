import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { AiExecutiveCopilotService, ExecutiveCopilotResponse } from './ai-executive-copilot.service';
import { AiOutcomeAnalyticsService, OutcomeAnalyticsResponse } from './ai-outcome-analytics.service';
import { OllamaClientService } from './ollama-client.service';
import { AskExecutiveQaDto } from './dto/ask-executive-qa.dto';

type ExecutiveQaConfidence = 'low' | 'medium' | 'high';
type ExecutiveQaTrustState = 'healthy' | 'limited' | 'issue_detected' | 'not_connected';
type ExecutiveQaCategory =
  | 'business_summary'
  | 'trust_and_visibility'
  | 'signals'
  | 'recommendations'
  | 'pending_actions'
  | 'agents'
  | 'learning'
  | 'integrations'
  | 'performance_change'
  | 'what_should_i_do'
  | 'unsupported';

type ExecutiveQaSource = {
  type: 'trust' | 'signal' | 'recommendation' | 'action' | 'agent_run' | 'learning' | 'store';
  id: string;
  title: string;
  detail?: string | null;
};

export type ExecutiveAnswerResponse = {
  answer: string;
  confidence: ExecutiveQaConfidence;
  trustState: ExecutiveQaTrustState;
  sources: ExecutiveQaSource[];
  supportingSignals: Array<{ id: string; title: string }>;
  supportingRecommendations: Array<{ id: string; title: string }>;
  supportingActions: Array<{ id: string; title: string; status: string }>;
  supportingAgentRuns: Array<{ runId: string; agentName: string; summary: string }>;
  limitations: string[];
  suggestedFollowUps: string[];
  generatedAt: string;
};

const STARTER_QUESTIONS = [
  'What changed today?',
  'Can I trust this data?',
  'What actions need review?',
  'What should I focus on next?',
  'What are the agents seeing?',
] as const;

@Injectable()
export class AiExecutiveQaService {
  constructor(
    private readonly aiExecutiveCopilotService: AiExecutiveCopilotService,
    private readonly aiOutcomeAnalyticsService: AiOutcomeAnalyticsService,
    private readonly ollamaClientService: OllamaClientService,
  ) {}

  getSuggestions() {
    return buildSuccessResponse('Executive Q&A suggestions retrieved successfully.', {
      suggestions: [...STARTER_QUESTIONS],
    });
  }

  async ask(principal: CurrentPrincipal, dto: AskExecutiveQaDto) {
    const copilot = await this.aiExecutiveCopilotService.getExecutiveCopilotPayload(
      principal,
      dto.organizationId,
      false,
    );
    const outcomeAnalytics = await this.aiOutcomeAnalyticsService.getOutcomeAnalyticsPayload(
      principal,
      dto.organizationId,
      30,
    );
    const category = this.classifyQuestion(dto.question);
    const deterministic = this.buildAnswer(category, copilot, outcomeAnalytics);
    const answer = await this.refineAnswer(deterministic.answer, deterministic.limitations);

    return buildSuccessResponse('Executive answer generated successfully.', {
      ...deterministic,
      answer,
      generatedAt: new Date().toISOString(),
    } satisfies ExecutiveAnswerResponse);
  }

  private classifyQuestion(question: string): ExecutiveQaCategory {
    const normalized = question.toLowerCase().trim();

    if (/what changed|summary|today|happening/.test(normalized)) {
      return 'business_summary';
    }
    if (/trust|can i trust|visibility|coverage|fresh|freshness|current/.test(normalized)) {
      return 'trust_and_visibility';
    }
    if (/signal|why.*signal|elevated/.test(normalized)) {
      return 'signals';
    }
    if (/recommend|opportunit|advis/.test(normalized)) {
      return 'recommendations';
    }
    if (/action|approval|pending|review/.test(normalized)) {
      return 'pending_actions';
    }
    if (/agent|agents/.test(normalized)) {
      return 'agents';
    }
    if (/learn|outcome|approval rate|useful/.test(normalized)) {
      return 'learning';
    }
    if (/integrat|shopify|stripe|payment visibility|store connection/.test(normalized)) {
      return 'integrations';
    }
    if (/revenue|orders|customers|momentum|under pressure|down|up|decline|spike/.test(normalized)) {
      return 'performance_change';
    }
    if (/what should i do|focus|next/.test(normalized)) {
      return 'what_should_i_do';
    }

    return 'unsupported';
  }

  private buildAnswer(
    category: ExecutiveQaCategory,
    copilot: ExecutiveCopilotResponse,
    outcomeAnalytics: OutcomeAnalyticsResponse,
  ): Omit<ExecutiveAnswerResponse, 'generatedAt'> {
    const limitations = this.buildLimitations(copilot);
    const base = {
      trustState: copilot.trust.overallStatus,
      limitations,
      sources: this.buildBaseSources(copilot),
      supportingSignals: copilot.keySignals.slice(0, 3).map((signal) => ({ id: signal.id, title: signal.title })),
      supportingRecommendations: copilot.keyRecommendations.slice(0, 3).map((recommendation) => ({
        id: recommendation.id,
        title: recommendation.title,
      })),
      supportingActions: copilot.pendingActions.slice(0, 3).map((action) => ({
        id: action.id,
        title: action.title,
        status: action.status,
      })),
      supportingAgentRuns: copilot.agentHighlights.slice(0, 3).map((run) => ({
        runId: run.runId,
        agentName: run.agentName,
        summary: run.summary,
      })),
      suggestedFollowUps: this.suggestFollowUps(category),
    } as const;

    switch (category) {
      case 'business_summary':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'high'),
          answer: this.joinSentences(
            copilot.topSummary.summary,
            `What changed: ${copilot.topSummary.whatChanged}`,
            `What matters: ${copilot.topSummary.whatMatters}`,
          ),
        };
      case 'trust_and_visibility':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'high'),
          answer: this.joinSentences(
            `Current trust is ${this.humanize(copilot.trust.overallStatus)}.`,
            copilot.trust.recommendedOperatorMessage,
            copilot.trust.limitations[0] ?? 'No major trust limitations are active right now.',
          ),
        };
      case 'signals':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'medium'),
          answer: this.joinSentences(
            copilot.keySignals[0]
              ? `${copilot.keySignals[0].title}: ${copilot.keySignals[0].summary}`
              : 'No significant signals are active right now.',
            copilot.keySignals[1]?.summary ?? null,
            copilot.trust.overallStatus === 'healthy' ? null : copilot.trust.recommendedOperatorMessage,
          ),
        };
      case 'recommendations':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'medium'),
          answer: this.joinSentences(
            copilot.keyRecommendations[0]
              ? `${copilot.keyRecommendations[0].title}: ${copilot.keyRecommendations[0].summary}`
              : 'No high-priority recommendations are active right now.',
            copilot.keyRecommendations[1]?.summary ?? null,
          ),
        };
      case 'pending_actions':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'high'),
          answer: this.joinSentences(
            copilot.pendingActions[0]
              ? `${copilot.pendingActions[0].title} is the highest-priority item waiting for review.`
              : 'No review actions are needed right now.',
            copilot.pendingActions[0]?.summary ?? null,
            copilot.pendingActions[1]?.summary ?? null,
          ),
        };
      case 'agents':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'medium'),
          answer: this.joinSentences(
            copilot.agentHighlights[0]
              ? `${copilot.agentHighlights[0].agentName} is most focused on ${this.lowercaseFirst(copilot.agentHighlights[0].summary)}`
              : 'No recent agent highlights are available yet.',
            copilot.agentHighlights[1]?.summary ?? null,
          ),
        };
      case 'learning':
        return {
          ...base,
          confidence: outcomeAnalytics.outcomeSummary.totalRecorded > 0 ? 'medium' : 'low',
          answer: this.joinSentences(
            outcomeAnalytics.summary,
            outcomeAnalytics.roiHighlights[0] ?? null,
          ),
        };
      case 'integrations':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'high'),
          answer: this.joinSentences(
            copilot.connectedStoreStatus.summary,
            `Shopify is ${this.humanize(copilot.trust.shopifyStatus)} and payments visibility is ${this.humanize(copilot.trust.stripeStatus)}.`,
            copilot.trust.limitations[0] ?? null,
          ),
        };
      case 'performance_change': {
        const performanceSignal = copilot.keySignals.find((signal) =>
          ['revenue', 'orders', 'customers'].includes(signal.affectedArea),
        );
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'medium'),
          answer: this.joinSentences(
            performanceSignal
              ? `${performanceSignal.title}: ${performanceSignal.summary}`
              : copilot.topSummary.whatChanged,
            performanceSignal?.reason ?? copilot.keyRecommendations[0]?.summary ?? null,
            copilot.trust.overallStatus === 'healthy' ? null : copilot.trust.recommendedOperatorMessage,
          ),
        };
      }
      case 'what_should_i_do':
        return {
          ...base,
          confidence: this.confidenceFromTrust(copilot.trust.overallStatus, 'medium'),
          answer: this.joinSentences(...copilot.executiveFocus.slice(0, 3)),
        };
      case 'unsupported':
      default:
        return {
          ...base,
          confidence: 'low',
          answer: 'I can answer questions about current store health, trust, signals, recommendations, actions, integrations, learning, and recent agent findings. That question is outside the current executive briefing scope.',
        };
    }
  }

  private buildLimitations(copilot: ExecutiveCopilotResponse) {
    return copilot.trust.limitations.slice(0, 3);
  }

  private buildBaseSources(copilot: ExecutiveCopilotResponse): ExecutiveQaSource[] {
    return [
      {
        type: 'trust',
        id: 'trust',
        title: `Trust: ${this.humanize(copilot.trust.overallStatus)}`,
        detail: copilot.trust.recommendedOperatorMessage,
      },
      ...copilot.keySignals.slice(0, 2).map((signal) => ({
        type: 'signal' as const,
        id: signal.id,
        title: signal.title,
        detail: signal.summary,
      })),
      ...copilot.keyRecommendations.slice(0, 2).map((recommendation) => ({
        type: 'recommendation' as const,
        id: recommendation.id,
        title: recommendation.title,
        detail: recommendation.summary,
      })),
      ...copilot.pendingActions.slice(0, 2).map((action) => ({
        type: 'action' as const,
        id: action.id,
        title: action.title,
        detail: action.summary,
      })),
      ...copilot.agentHighlights.slice(0, 1).map((run) => ({
        type: 'agent_run' as const,
        id: run.runId,
        title: run.agentName,
        detail: run.summary,
      })),
    ];
  }

  private confidenceFromTrust(
    trustState: ExecutiveQaTrustState,
    desired: ExecutiveQaConfidence,
  ): ExecutiveQaConfidence {
    if (trustState === 'not_connected') {
      return 'low';
    }
    if (trustState === 'issue_detected') {
      return desired === 'high' ? 'medium' : 'low';
    }
    if (trustState === 'limited') {
      return desired === 'high' ? 'medium' : desired;
    }
    return desired;
  }

  private suggestFollowUps(category: ExecutiveQaCategory) {
    switch (category) {
      case 'business_summary':
        return ['Can I trust this data?', 'What should I focus on next?'];
      case 'trust_and_visibility':
        return ['What changed today?', 'What actions need review?'];
      case 'signals':
      case 'performance_change':
        return ['What should I focus on next?', 'What actions need review?'];
      case 'agents':
        return ['What changed today?', 'What should I focus on next?'];
      case 'pending_actions':
        return ['What are the agents seeing?', 'Can I trust this data?'];
      default:
        return [...STARTER_QUESTIONS].slice(0, 2);
    }
  }

  private async refineAnswer(answer: string, limitations: string[]) {
    try {
      const response = await this.ollamaClientService.chatJson({
        model: 'qwen2.5:7b-instruct',
        messages: [
          {
            role: 'system',
            content:
              'You are an executive commerce analyst. Rewrite this answer clearly and concisely without adding information. Return JSON: {"answer":"..."}',
          },
          {
            role: 'user',
            content: JSON.stringify({ answer, limitations }),
          },
        ],
      });

      const parsed = JSON.parse(response.content) as { answer?: unknown };
      if (typeof parsed.answer !== 'string' || !parsed.answer.trim()) {
        return answer;
      }

      return parsed.answer.trim();
    } catch (error) {
      if (
        error instanceof GatewayTimeoutException ||
        error instanceof ServiceUnavailableException ||
        error instanceof BadGatewayException
      ) {
        return answer;
      }

      return answer;
    }
  }

  private joinSentences(...values: Array<string | null | undefined>) {
    const deduped = new Set<string>();

    return values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace(/[.!?]+$/g, '').trim())
      .filter((value) => {
        const normalized = value.toLowerCase();
        if (deduped.has(normalized)) {
          return false;
        }
        deduped.add(normalized);
        return true;
      })
      .map((value) => `${value}.`)
      .join(' ');
  }

  private humanize(value: string) {
    return value
      .split('_')
      .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
      .join(' ');
  }

  private lowercaseFirst(value: string) {
    if (!value) {
      return value;
    }

    return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
  }
}
