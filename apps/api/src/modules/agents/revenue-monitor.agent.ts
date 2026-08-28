import { Injectable } from '@nestjs/common';
import { ActionTypes } from '../actions/action.constants';

import { CommerceAgentContext, CommerceAgentOutput } from './commerce-agent.types';

@Injectable()
export class RevenueMonitorAgent {
  run(context: CommerceAgentContext): CommerceAgentOutput {
    const metrics = context.overviewMetrics;
    const revenueSignal = context.signals.find(
      (signal) => signal.type === 'revenue_drop' || signal.type === 'order_slowdown',
    );
    const demandSpikeSignal = context.signals.find((signal) => signal.type === 'demand_spike');
    const trustLimited = context.dataTrust.overallStatus !== 'healthy';

    return {
      summary: this.buildSummary(metrics, revenueSignal?.title, demandSpikeSignal?.title, trustLimited),
      observations: this.compact([
        `Revenue today is ${this.formatCurrency(metrics.totalRevenueToday)} versus ${this.formatCurrency(metrics.previous24h.revenue)} in the previous 24 hours.`,
        `Orders today are ${metrics.totalOrdersToday} versus ${metrics.previous24h.orders} in the previous 24 hours.`,
        revenueSignal?.summary ?? null,
        demandSpikeSignal?.summary ?? null,
      ]),
      recommendations: this.compact([
        context.recommendations.find((item) => item.type === 'monitor_revenue_decline')?.title ?? null,
        context.recommendations.find((item) => item.type === 'capitalize_on_demand_spike')?.title ?? null,
      ]),
      proposals: this.compact([
        revenueSignal ? 'Investigate the drivers behind the revenue and order change before changing pricing or acquisition spend.' : null,
        demandSpikeSignal ? 'Validate whether the current demand spike is sustainable and operationally supported.' : null,
      ]),
      suggestedExecutions: this.compactExecutions([
        revenueSignal || context.dataTrust.freshnessStatus !== 'up_to_date'
          ? {
              actionType: ActionTypes.RUN_SHOPIFY_SYNC,
              summary: 'Refresh store sync before escalating the revenue movement.',
              safe: true,
            }
          : null,
      ]),
      confidence: trustLimited ? 'medium' : revenueSignal ? 'high' : 'medium',
      evidence: this.compact([
        `Revenue delta: ${this.formatPercent(metrics.totalRevenueToday, metrics.previous24h.revenue)}.`,
        `Order delta: ${this.formatPercent(metrics.totalOrdersToday, metrics.previous24h.orders)}.`,
        ...((revenueSignal?.evidence ?? demandSpikeSignal?.evidence ?? []).slice(0, 3)),
      ]),
    };
  }

  private buildSummary(
    metrics: CommerceAgentContext['overviewMetrics'],
    revenueSignalTitle?: string,
    demandSpikeSignalTitle?: string,
    trustLimited?: boolean,
  ) {
    if (revenueSignalTitle) {
      return `${revenueSignalTitle} Revenue and order movement should be reviewed before any commercial response is approved${trustLimited ? ', because current visibility is not fully healthy.' : '.'}`;
    }

    if (demandSpikeSignalTitle) {
      return `${demandSpikeSignalTitle} Revenue momentum looks stronger than the previous 24 hours, and operators should confirm that demand strength is real before scaling into it.`;
    }

    return `Revenue performance is currently stable, with ${this.formatCurrency(metrics.totalRevenueToday)} in revenue and ${metrics.totalOrdersToday} orders recorded today.`;
  }

  private formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private formatPercent(current: number, previous: number) {
    if (!previous) {
      return current > 0 ? 'new activity recorded' : 'no comparable change';
    }

    const delta = ((current - previous) / previous) * 100;
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs previous 24h`;
  }

  private compact(items: Array<string | null>) {
    return items.filter((item): item is string => Boolean(item?.trim()));
  }

  private compactExecutions(items: Array<CommerceAgentOutput['suggestedExecutions'][number] | null>) {
    return items.filter((item): item is CommerceAgentOutput['suggestedExecutions'][number] => Boolean(item));
  }
}
