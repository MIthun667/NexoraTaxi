'use client';

import Link from 'next/link';
import { BotMessageSquare, FileText, MessageSquareText } from 'lucide-react';

import { SectionCard } from '@/components/layout/section-card';
import { ExecutiveMemoItem, LeadershipAssistantPrompt } from '@/types/executive';

export function LeadershipAssistantDrawer({
  prompts,
  memos,
}: {
  prompts: LeadershipAssistantPrompt[];
  memos: ExecutiveMemoItem[];
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        eyebrow="Leadership assistant"
        title="Ask AI leadership questions"
        description="This assistant opens evidence-backed decision paths. It does not act directly on the company."
      >
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
            >
              <MessageSquareText className="mt-0.5 h-4 w-4 text-[var(--brand-500)]" />
              <div>
                <p className="font-medium text-white">{prompt.label}</p>
                <p className="mt-1 text-sm text-slate-400">{prompt.prompt}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Decision memos"
        title="Supporting reports"
        description="Leadership memos turn AI analysis into reviewable reports with evidence and supporting facts."
      >
        <div className="space-y-3">
          {memos.map((memo) => (
            <Link
              key={memo.id}
              href={memo.href as never}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
            >
              <FileText className="mt-0.5 h-4 w-4 text-[var(--brand-500)]" />
              <div>
                <p className="font-medium text-white">{memo.title}</p>
                <p className="mt-1 text-sm text-slate-400">{memo.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Safety"
        title="How this panel behaves"
        description="Leadership AI stays on the recommendation side of the line."
      >
        <div className="space-y-3 text-sm text-slate-400">
          <div className="flex items-start gap-3">
            <BotMessageSquare className="mt-0.5 h-4 w-4 text-sky-300" />
            <p>Answers should explain metrics and priorities, not mutate operational state.</p>
          </div>
          <div className="flex items-start gap-3">
            <BotMessageSquare className="mt-0.5 h-4 w-4 text-sky-300" />
            <p>Every recommendation should link to evidence, approvals, or the detailed command centers.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
