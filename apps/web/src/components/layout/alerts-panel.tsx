import { AlertItem } from '@/types/dashboard';

import { SectionCard } from '@/components/layout/section-card';

export function AlertsPanel({
  alerts,
  eyebrow = 'Operational alerts',
  title = 'Attention queue',
  description = 'Computed risk and workflow alerts that require operator follow-up.',
}: {
  alerts: AlertItem[];
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <SectionCard
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
            No active operational alerts were generated for the current dashboard scope.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{alert.title}</p>
                <span className="rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">
                  {alert.severity}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{alert.description}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{alert.category}</span>
                {alert.entityId ? (
                  <span className="text-[var(--brand-400)]">
                    {alert.entityType} {alert.entityId.slice(0, 8)}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
