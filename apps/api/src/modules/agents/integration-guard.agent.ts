import { Injectable } from '@nestjs/common';
import { ActionTypes } from '../actions/action.constants';

import { CommerceAgentContext, CommerceAgentOutput } from './commerce-agent.types';

@Injectable()
export class IntegrationGuardAgent {
  run(context: CommerceAgentContext): CommerceAgentOutput {
    const trust = context.dataTrust;
    const syncSignal = context.signals.find((signal) => signal.type === 'sync_issue');
    const visibilitySignal = context.signals.find(
      (signal) =>
        signal.type === 'payment_visibility_gap' || signal.type === 'data_coverage_limit',
    );

    return {
      summary: this.buildSummary(trust, syncSignal?.title, visibilitySignal?.title),
      observations: this.compact([
        `Shopify status is ${trust.shopifyStatus.replaceAll('_', ' ')}.`,
        `Payments status is ${trust.stripeStatus.replaceAll('_', ' ')}.`,
        `Coverage is ${trust.coverageStatus}.`,
        syncSignal?.summary ?? null,
        visibilitySignal?.summary ?? null,
      ]),
      recommendations: this.compact([
        context.recommendations.find((item) => item.type === 'review_sync_health')?.title ?? null,
        context.recommendations.find((item) => item.type === 'improve_visibility')?.title ?? null,
        context.recommendations.find((item) => item.type === 'review_payment_reliability')?.title ?? null,
      ]),
      proposals: this.compact([
        syncSignal ? 'Retry the affected sync path before relying on recent changes.' : null,
        trust.stripeStatus === 'not_connected'
          ? 'Connect payments visibility so refund and payment signals become available.'
          : null,
        trust.coverageStatus !== 'full'
          ? 'Review Shopify permissions and visibility limits before acting on incomplete store coverage.'
          : null,
      ]),
      suggestedExecutions: this.compactExecutions([
        syncSignal || trust.shopifyStatus === 'stale' || trust.shopifyStatus === 'failed'
          ? {
              actionType: ActionTypes.RUN_SHOPIFY_SYNC,
              summary: 'Retry Shopify sync to restore current store visibility.',
              safe: true,
            }
          : null,
        trust.stripeStatus === 'not_connected'
          ? {
              actionType: ActionTypes.CONNECT_STRIPE,
              summary: 'Connect Stripe to restore payments visibility.',
              safe: true,
            }
          : null,
      ]),
      confidence: trust.overallStatus === 'healthy' ? 'high' : 'medium',
      evidence: this.compact([
        ...trust.evidence.slice(0, 4),
        ...trust.limitations.slice(0, 2),
      ]),
    };
  }

  private buildSummary(
    trust: CommerceAgentContext['dataTrust'],
    syncSignalTitle?: string,
    visibilitySignalTitle?: string,
  ) {
    if (trust.overallStatus === 'not_connected') {
      return 'No connected store is currently active, so commerce intelligence cannot run reliably yet.';
    }

    if (syncSignalTitle) {
      return `${syncSignalTitle} Operators should restore sync health before relying on recent signals, recommendations, or proposals.`;
    }

    if (visibilitySignalTitle) {
      return `${visibilitySignalTitle} Some commerce domains are still limited, so parts of the product surface should be treated cautiously.`;
    }

    return 'Integration health is currently stable. Shopify and payments connectivity are in a state that supports normal operator review.';
  }

  private compact(items: Array<string | null>) {
    return items.filter((item): item is string => Boolean(item?.trim()));
  }

  private compactExecutions(items: Array<CommerceAgentOutput['suggestedExecutions'][number] | null>) {
    return items.filter((item): item is CommerceAgentOutput['suggestedExecutions'][number] => Boolean(item));
  }
}
