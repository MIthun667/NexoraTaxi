'use client';

import type { Route } from 'next';
import Link from 'next/link';

import { DataTable } from '@/components/tables/data-table';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { AgentRunListItem } from '@/types/ai';
import { ApiMeta } from '@/types/api';
import { formatDateTime, formatEnumLabel } from '@/lib/utils';

export function AgentRunTable({
  items,
  meta,
}: {
  items: AgentRunListItem[];
  meta?: ApiMeta;
}) {
  return (
    <DataTable
      data={items}
      meta={meta}
      rowKey={(row) => row.id}
      columns={[
        {
          key: 'agentName',
          title: 'Agent',
          sortable: true,
          render: (row) => (
            <div>
              <p className="font-medium text-white">{row.agentName}</p>
              <p className="mt-1 text-xs text-slate-400">
                {row.triggerReason ?? row.summary ?? formatEnumLabel(row.agentCode)}
              </p>
            </div>
          ),
        },
        {
          key: 'id',
          title: 'Run',
          render: (row) => (
            <div>
              <p className="font-medium text-slate-200">{row.id.slice(0, 8)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatEnumLabel(row.triggerType)}</p>
            </div>
          ),
        },
        {
          key: 'target',
          title: 'Target',
          render: (row) => (
            <div className="text-sm text-slate-300">
              <p>{row.targetEntityId ?? '-'}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                {row.targetEntityType ? formatEnumLabel(row.targetEntityType) : 'No target'}
              </p>
            </div>
          ),
        },
        {
          key: 'status',
          title: 'Status',
          render: (row) => <StatusBadge value={row.status} />,
        },
        {
          key: 'confidence',
          title: 'Confidence',
          render: (row) => (row.confidence ? <SeverityBadge value={row.confidence} /> : '-'),
        },
        {
          key: 'actionsProposed',
          title: 'Actions',
          sortable: true,
          render: (row) => row.actionsProposed,
        },
        {
          key: 'startedAt',
          title: 'Started',
          sortable: true,
          render: (row) => formatDateTime(row.startedAt),
        },
        {
          key: 'finishedAt',
          title: 'Finished',
          render: (row) => (row.finishedAt ? formatDateTime(row.finishedAt) : 'In progress'),
        },
      ]}
      rowActions={(row) => (
        <Link
          href={`/ai/runs/${row.id}` as Route}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
        >
          View run
        </Link>
      )}
    />
  );
}
