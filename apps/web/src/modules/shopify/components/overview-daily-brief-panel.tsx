'use client';

import { AlertCircle, Loader2, Sparkles, ShieldAlert } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { ShopifyDailyBrief } from '@/types/daily-brief';
import { CommerceDataTrustStatus } from '@/types/shopify-intelligence';

export function OverviewDailyBriefPanel({
  brief,
  trust,
  isLoading,
  errorMessage,
  canRefresh,
  isRefreshing,
  onRefresh,
}: {
  brief: ShopifyDailyBrief | null;
  trust?: CommerceDataTrustStatus | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  canRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SectionCard
      eyebrow="Intelligence"
      title="Daily Brief"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-slate-400 hover:text-white"
          onClick={onRefresh}
          disabled={!canRefresh || isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshIcon className="h-3.5 w-3.5" />
          )}
          <span className="ml-2 text-xs font-medium">Refresh</span>
        </Button>
      }
    >
      <div className="space-y-5">
        {trust && trust.overallStatus !== 'healthy' ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80 border border-amber-500/10">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500/50" />
            <p className="leading-relaxed">
              Data is delayed. {trust.recommendedOperatorMessage}
            </p>
          </div>
        ) : null}

        {isLoading && !brief ? (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
          </div>
        ) : errorMessage ? (
          <div className="flex items-start gap-2 rounded-lg bg-rose-500/5 px-3 py-2 text-xs text-rose-300 border border-rose-500/10">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />
            <p>{errorMessage}</p>
          </div>
        ) : (
          <div className="max-w-2xl">
            <p className="text-[15px] leading-relaxed text-slate-200 font-medium">
              {brief?.summary || 'Data is still being collected. Insights will improve as activity increases.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
          <BriefList 
            title="Key Signals" 
            items={brief?.signals ?? []} 
            emptyLabel="No significant changes detected." 
          />
          <BriefList 
            title="Key Risks" 
            items={brief?.risks ?? []} 
            emptyLabel="No material risks are active." 
          />
          <BriefList 
            title="Recommended Actions" 
            items={brief?.actions ?? []} 
            emptyLabel="No immediate action required." 
          />
        </div>
      </div>
    </SectionCard>
  );
}

function BriefList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 italic">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2 text-[13px] text-slate-400">
          {items.slice(0, 3).map((item, index) => (
            <li key={`${title}-${index}-${item}`} className="flex gap-2.5 items-start">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-700" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21v-5h5" />
    </svg>
  );
}
