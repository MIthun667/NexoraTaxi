'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, AlertTriangle, ClipboardCheck, Sparkles, ChevronRight } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ShopifyActionProposal,
  ShopifyAiRecommendation,
  ShopifyAiSignal,
} from '@/types/shopify-intelligence';

type AttentionItem = {
  id: string;
  title: string;
  reason: string;
  urgency: 'High' | 'Medium';
  category: 'Signal' | 'Opportunity' | 'Action';
  href: Route;
};

export function OverviewNeedsAttention({
  signals,
  recommendations,
  proposals,
}: {
  signals: ShopifyAiSignal[];
  recommendations: ShopifyAiRecommendation[];
  proposals: ShopifyActionProposal[];
}) {
  const items = buildAttentionItems(signals, recommendations, proposals);

  return (
    <SectionCard
      eyebrow="Queue"
      title="Needs Attention"
      variant="subtle"
    >
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="px-1 py-4 text-xs text-slate-500 italic">No critical issues detected.</p>
        ) : null}
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group block px-1 py-3 transition hover:bg-white/[0.02] rounded-lg -mx-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <AttentionBadge category={item.category} />
                  <UrgencyBadge urgency={item.urgency} />
                </div>
                <p className="text-[13px] font-bold text-slate-200 truncate">{item.title}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{item.reason}</p>
              </div>
              <ChevronRight className="mt-6 h-3.5 w-3.5 shrink-0 text-slate-700 transition group-hover:text-slate-400 group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
        {items.length > 0 && (
          <div className="pt-3 mt-1 border-t border-white/5">
             <Link href="/shopify/action-proposals">
               <Button variant="ghost" size="sm" className="h-auto p-0 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[var(--brand-400)]">
                 View all pending <ArrowRight className="ml-1 h-3 w-3" />
               </Button>
             </Link>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function AttentionBadge({ category }: { category: AttentionItem['category'] }) {
  const Icon =
    category === 'Signal' ? AlertTriangle : category === 'Opportunity' ? Sparkles : ClipboardCheck;

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
      <Icon className="h-2.5 w-2.5" />
      {category}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: AttentionItem['urgency'] }) {
  return (
    <span
      className={cn(
        'inline-flex text-[9px] font-black uppercase tracking-[0.2em]',
        urgency === 'High'
          ? 'text-rose-500/80'
          : 'text-amber-500/80',
      )}
    >
      {urgency}
    </span>
  );
}

function buildAttentionItems(
  signals: ShopifyAiSignal[],
  recommendations: ShopifyAiRecommendation[],
  proposals: ShopifyActionProposal[],
) {
  // Dedupe and limit to top 3
  const signalItems: AttentionItem[] = signals
    .filter((signal) => signal.severity === 'high' || signal.severity === 'critical')
    .slice(0, 2)
    .map((signal) => ({
      id: `signal-${signal.id}`,
      title: signal.title,
      reason: signal.reason || signal.summary || 'Critical signal review required.',
      urgency: 'High',
      category: 'Signal',
      href: '/shopify/signals',
    }));

  const opportunityItems: AttentionItem[] = recommendations
    .filter((recommendation) => recommendation.urgency === 'high')
    .slice(0, 1)
    .map((recommendation) => ({
      id: `recommendation-${recommendation.id}`,
      title: recommendation.title,
      reason: recommendation.rationale || recommendation.summary || recommendation.description,
      urgency: 'High',
      category: 'Opportunity',
      href: '/shopify/recommendations',
    }));

  const actionItems: AttentionItem[] = proposals
    .filter((proposal) => proposal.status === 'PENDING' || proposal.status === 'NEEDS_REVISION')
    .slice(0, 2)
    .map((proposal) => ({
      id: `proposal-${proposal.id}`,
      title: proposal.title,
      reason: proposal.summary || 'Action requires review.',
      urgency: proposal.priority === 'CRITICAL' || proposal.priority === 'HIGH' ? 'High' : 'Medium',
      category: 'Action',
      href: '/shopify/action-proposals',
    }));

  return [...signalItems, ...actionItems, ...opportunityItems]
    .sort((a, b) => (a.urgency === 'High' ? -1 : 1))
    .slice(0, 3);
}
