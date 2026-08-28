import { CarFront, Route, UserRound } from 'lucide-react';

import { Card } from '@/components/ui/card';

export function AssignmentSummaryCard({
  driver,
  vehicle,
  zone,
  shift,
}: {
  driver?: string | null;
  vehicle?: string | null;
  zone?: string | null;
  shift?: string | null;
}) {
  const items = [
    { label: 'Operator', value: driver ?? '-', icon: UserRound },
    { label: 'Asset', value: vehicle ?? '-', icon: CarFront },
    { label: 'Operational Zone', value: zone ?? '-', icon: Route },
    { label: 'Operational Shift', value: shift ?? '-', icon: Route },
  ];

  return (
    <Card className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Icon className="h-4 w-4 text-[var(--brand-400)]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-white">{item.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
