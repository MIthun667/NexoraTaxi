import { Injectable } from '@nestjs/common';

import { CommerceAgentContext, CommerceAgentOutput } from './commerce-agent.types';

@Injectable()
export class CommerceHealthAgent {
  run(context: CommerceAgentContext): CommerceAgentOutput {
    const trust = context.dataTrust;
    const criticalSignals = context.signals.filter(
      (signal) => signal.severity === 'critical' || signal.severity === 'high',
    );
    const pendingProposals = context.proposals.filter((proposal) =>
      ['PENDING', 'IN_REVIEW', 'APPROVED'].includes(String(proposal.status ?? '')),
    );

    return {
      summary: this.buildSummary(context, criticalSignals.length, pendingProposals.length),
      observations: this.compact([
        `Overall data trust is ${trust.overallStatus.replaceAll('_', ' ')}.`,
        `Freshness is ${trust.freshnessStatus.replaceAll('_', ' ')} with ${trust.coverageStatus} coverage.`,
        criticalSignals.length > 0
          ? `${criticalSignals.length} high-priority signals are active.`
          : 'No high-priority signals are active.',
        pendingProposals.length > 0
          ? `${pendingProposals.length} action proposals are waiting for review or execution.`
          : null,
      ]),
      recommendations: this.compact([
        context.recommendations[0]?.title ?? null,
        context.recommendations[1]?.title ?? null,
      ]),
      proposals: this.compact([
        criticalSignals.length > 0 ? 'Review the highest-priority risks before acting on lower-signal changes.' : null,
        trust.overallStatus !== 'healthy'
          ? 'Restore store trust and visibility before broad commercial changes are made.'
          : null,
      ]),
      suggestedExecutions: [],
      confidence: trust.overallStatus === 'healthy' ? 'high' : trust.overallStatus === 'limited' ? 'medium' : 'low',
      evidence: this.compact([
        ...trust.evidence.slice(0, 3),
        ...criticalSignals.flatMap((signal) => signal.evidence).slice(0, 3),
      ]),
    };
  }

  private buildSummary(
    context: CommerceAgentContext,
    criticalSignalCount: number,
    pendingProposalCount: number,
  ) {
    const trust = context.dataTrust;

    if (trust.overallStatus === 'not_connected') {
      return 'Store intelligence is unavailable because no connected store is active yet.';
    }

    if (criticalSignalCount > 0) {
      return `Commerce health needs attention. ${criticalSignalCount} high-priority signal${criticalSignalCount === 1 ? ' is' : 's are'} active, and ${pendingProposalCount} follow-up action${pendingProposalCount === 1 ? ' is' : 's are'} currently in review.`;
    }

    if (trust.overallStatus !== 'healthy') {
      return `Commerce health is currently ${trust.overallStatus.replaceAll('_', ' ')}. Operators should verify data trust before relying on short-term trends or automation.`;
    }

    return 'Commerce health is stable. Store data is current enough to support brief, signal, and proposal review with normal operator confidence.';
  }

  private compact(items: Array<string | null>) {
    return items.filter((item): item is string => Boolean(item?.trim()));
  }
}
