'use client';

import Link from 'next/link';

import { DataTable } from '@/components/tables/data-table';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { PolicyViolationItem } from '@/types/ai';
import { ApiMeta } from '@/types/api';
import { formatDateTime } from '@/lib/utils';

export function PolicyViolationTable({
  items,
  meta,
}: {
  items: PolicyViolationItem[];
  meta?: ApiMeta;
}) {
  return (
    <DataTable
      data={items}
      meta={meta}
      rowKey={(row) => row.id}
      columns={[
        { key: 'agentName', title: 'Agent', render: (row) => row.agentName },
        { key: 'violationType', title: 'Violation', render: (row) => row.violationType },
        { key: 'severity', title: 'Severity', render: (row) => <SeverityBadge value={row.severity} /> },
        { key: 'description', title: 'Description', render: (row) => <span className="text-slate-300">{row.description}</span> },
        { key: 'detectedAt', title: 'Detected', render: (row) => formatDateTime(row.detectedAt) },
      ]}
      rowActions={(row) => (
        <Link
          href={`/ai/runs/${row.agentRunId}`}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
        >
          Open run
        </Link>
      )}
    />
  );
}
