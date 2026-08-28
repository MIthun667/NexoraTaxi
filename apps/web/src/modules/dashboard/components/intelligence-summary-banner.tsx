'use client';

import { BrainCircuit, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { IntelligenceBannerData } from '@/lib/command-intelligence';

export function IntelligenceSummaryBanner({
  data,
}: {
  data: IntelligenceBannerData;
}) {
  const Icon = getToneIcon(data.tone);

  return (
    <SectionCard
      eyebrow={data.eyebrow}
      title={data.title}
      description="Telemetry-driven operational posture based on live execution signals."
      actions={
        <div className={toneBadgeClassName(data.tone)}>
          <Icon className="h-4 w-4" />
          {data.postureLabel}
        </div>
      }
    >
      <div className="space-y-4">
        <div className={tonePanelClassName(data.tone)}>
          <p className="text-sm leading-6 text-slate-100">{data.summary}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {data.supportingFacts.map((fact) => (
            <div
              key={fact}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
            >
              {fact}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function getToneIcon(tone: IntelligenceBannerData['tone']) {
  if (tone === 'critical') {
    return ShieldAlert;
  }

  if (tone === 'opportunity') {
    return TrendingUp;
  }

  if (tone === 'watch') {
    return BrainCircuit;
  }

  return Sparkles;
}

function toneBadgeClassName(tone: IntelligenceBannerData['tone']) {
  if (tone === 'critical') {
    return 'inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100';
  }

  if (tone === 'watch') {
    return 'inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100';
  }

  if (tone === 'opportunity') {
    return 'inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100';
  }

  return 'inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100';
}

function tonePanelClassName(tone: IntelligenceBannerData['tone']) {
  if (tone === 'critical') {
    return 'rounded-3xl border border-rose-500/20 bg-[linear-gradient(135deg,rgba(225,29,72,0.12),rgba(249,115,22,0.08))] p-5';
  }

  if (tone === 'watch') {
    return 'rounded-3xl border border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(14,165,233,0.06))] p-5';
  }

  if (tone === 'opportunity') {
    return 'rounded-3xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(14,165,233,0.06))] p-5';
  }

  return 'rounded-3xl border border-sky-500/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(99,102,241,0.06))] p-5';
}
