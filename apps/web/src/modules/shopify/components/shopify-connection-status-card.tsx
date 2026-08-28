import { CheckCircle2, Clock3, Link2Off, Store } from 'lucide-react';
import Link from 'next/link';

import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/utils';
import { ShopifyConnectionStatus } from '@/types/shopify';

export function ShopifyConnectionStatusCard({
  status,
  connectedFromOauth,
  showManageLink,
}: {
  status: ShopifyConnectionStatus | null;
  connectedFromOauth?: boolean;
  showManageLink?: boolean;
}) {
  const store = status?.store;
  const isActive = store?.isActive;

  return (
    <SectionCard
      eyebrow="Integration"
      title="Store Status"
      variant="subtle"
      actions={
        showManageLink ? (
          <Link href="/shopify/connected-stores">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500 hover:text-white">
              Manage
            </Button>
          </Link>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
            {isActive ? <CheckCircle2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-200 truncate">
              {store?.shopDomain ?? 'No store linked'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {isActive ? 'Connected via OAuth' : 'Pending connection'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CompactStat
            icon={Store}
            label="Installed"
            value={store?.installedAt ? new Date(store.installedAt).toLocaleDateString() : '--'}
          />
          <CompactStat
            icon={Clock3}
            label="Sync"
            value={status?.latestSyncRun ? new Date(status.latestSyncRun.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
          />
        </div>

        {status?.limitedAccess && (
          <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-200/60 leading-normal">
            Orders and customer signals are limited until Shopify protected data approval is granted.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function CompactStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-xs font-bold text-slate-300">{value}</p>
    </div>
  );
}
