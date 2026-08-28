import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function ErrorState({
  title = 'Unable to load this surface.',
  description = 'The platform returned an error while loading operational data.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-rose-500/20 bg-rose-950/10">
      <div className="flex flex-col gap-4 rounded-2xl border border-rose-500/15 bg-rose-500/[0.06] p-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-500/15 text-rose-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-white">{title}</p>
            <p className="text-sm text-slate-300">{description}</p>
          </div>
        </div>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
