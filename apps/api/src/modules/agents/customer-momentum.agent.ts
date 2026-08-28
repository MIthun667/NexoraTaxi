import { Injectable } from '@nestjs/common';

import { CommerceAgentContext, CommerceAgentOutput } from './commerce-agent.types';

@Injectable()
export class CustomerMomentumAgent {
  run(context: CommerceAgentContext): CommerceAgentOutput {
    const metrics = context.overviewMetrics;
    const customerSignal = context.signals.find((signal) => signal.type === 'customer_slowdown');
    const customerRecommendation = context.recommendations.find(
      (item) => item.type === 'investigate_customer_slowdown',
    );

    return {
      summary: customerSignal
        ? 'Customer momentum needs attention. Recent customer activity is weaker than expected and should be reviewed before new acquisition or retention changes are made.'
        : metrics.totalNewCustomersToday > 0
          ? `Customer momentum is currently active, with ${metrics.totalNewCustomersToday} new customers recorded today.`
          : 'Customer momentum is quiet today. No strong slowdown signal is active, but operators should continue monitoring acquisition and repeat-order behavior.',
      observations: this.compact([
        `New customers today: ${metrics.totalNewCustomersToday} versus ${metrics.previous24h.newCustomers} in the previous 24 hours.`,
        customerSignal?.summary ?? null,
        context.dataTrust.coverageStatus !== 'full'
          ? 'Customer visibility is currently limited, so customer trend interpretation should stay cautious.'
          : null,
      ]),
      recommendations: this.compact([
        customerRecommendation?.title ?? null,
        customerRecommendation?.expectedOutcome ?? null,
      ]),
      proposals: this.compact([
        customerSignal ? 'Review customer acquisition and retention drivers before changing campaigns or offer strategy.' : null,
        context.dataTrust.coverageStatus !== 'full'
          ? 'Restore customer data coverage before escalating a customer slowdown conclusion.'
          : null,
      ]),
      suggestedExecutions: [],
      confidence:
        context.dataTrust.coverageStatus === 'full'
          ? customerSignal
            ? 'high'
            : 'medium'
          : 'low',
      evidence: this.compact([
        ...((customerSignal?.evidence ?? []).slice(0, 3)),
        context.dataTrust.coverageStatus !== 'full'
          ? 'Customer coverage is not currently full.'
          : null,
      ]),
    };
  }

  private compact(items: Array<string | null>) {
    return items.filter((item): item is string => Boolean(item?.trim()));
  }
}
