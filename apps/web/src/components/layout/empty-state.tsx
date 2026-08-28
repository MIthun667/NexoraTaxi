import { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border border-dashed border-white/10 bg-white/[0.02] p-6">
      <div className="space-y-3 text-center">
        <div className="space-y-1">
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        {action ? <div className="flex justify-center">{action}</div> : null}
      </div>
    </Card>
  );
}
