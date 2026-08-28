import { LucideIcon } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

export function MetricCard({
  title,
  value,
  suffix,
  description,
  icon: Icon,
  compact = false,
}: {
  title: string;
  value: number;
  suffix?: string;
  description: string;
  icon: LucideIcon;
  compact?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden group hover:bg-white/[0.03] transition-colors duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80">{title}</p>
            <p className="text-2xl font-black tracking-tight text-white leading-none">
              {formatNumber(value)}
              {suffix ? <span className="ml-1 text-sm font-bold text-slate-500">{suffix}</span> : null}
            </p>
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400 group-hover:text-[var(--brand-400)] transition-colors">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-[11px] font-medium text-slate-500/80 leading-relaxed border-t border-white/5 pt-3">
          {description}
        </p>
      </div>
    </Card>
  );
}
