import { Card } from '@/components/ui/card';

export function LoadingState({
  title = 'Loading data...',
  description = 'Retrieving the latest platform state.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="border-white/10 bg-slate-950/60">
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-base font-semibold text-white">{title}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </Card>
  );
}
