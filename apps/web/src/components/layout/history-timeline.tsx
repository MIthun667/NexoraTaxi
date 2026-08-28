import { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

export type TimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  timestamp: string;
  meta?: ReactNode;
};

export function HistoryTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <Card className="p-0">
      <div className="space-y-0 divide-y divide-white/10">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">No operational history is available.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex gap-4 p-5">
              <div className="flex flex-col items-center">
                <div className="mt-1 h-3 w-3 rounded-full bg-[var(--brand-500)]" />
                <div className="mt-2 h-full w-px bg-white/10" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {item.timestamp}
                  </p>
                </div>
                {item.description ? (
                  <p className="text-sm text-slate-400">{item.description}</p>
                ) : null}
                {item.meta ? <div className="pt-1">{item.meta}</div> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
