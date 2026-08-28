'use client';

import Link from 'next/link';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/layout/section-card';
import { DataTable } from '@/components/tables/data-table';
import { useObservabilityRecords } from '@/hooks/queries/use-ai-command-center';
import { formatDateTime } from '@/lib/utils';

export function ObservabilityScreen() {
  const observability = useObservabilityRecords({ page: 1, limit: 20 });

  if (observability.isLoading) {
    return (
      <LoadingState
        title="Loading observability traces..."
        description="Gathering prompt audits, reasoning summaries, retrieval bundles, and decision traces."
      />
    );
  }

  if (observability.isError) {
    return <ErrorState title="Unable to load observability data." onRetry={() => observability.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observability"
        title="Decision Traces & Prompt Audit"
        description="Inspect retrieval bundles, prompt traces, and reasoning summaries with safe redaction for enterprise review."
      />

      <SectionCard
        eyebrow="Safe display rules"
        title="What operators can see"
        description="Sensitive prompt inputs and raw identifiers remain redacted. The UI shows bounded summaries, not unrestricted model traces."
      >
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Prompt content is summarized and redacted before display.</li>
          <li>• Retrieval bundles are limited to operationally relevant fields.</li>
          <li>• Full raw requests and responses remain backend-governed artifacts.</li>
        </ul>
      </SectionCard>

      <DataTable
        data={observability.data?.items ?? []}
        meta={observability.data?.meta}
        rowKey={(row) => row.id}
        columns={[
          { key: 'agentName', title: 'Agent', render: (row) => row.agentName },
          { key: 'reasoningSummary', title: 'Reasoning summary', render: (row) => row.reasoningSummary },
          { key: 'retrievalSummary', title: 'Retrieval bundle', render: (row) => row.retrievalSummary },
          { key: 'promptAudit', title: 'Prompt audit', render: (row) => row.promptAudit },
          { key: 'traceStatus', title: 'Trace status', render: (row) => row.traceStatus },
          { key: 'createdAt', title: 'Captured', render: (row) => formatDateTime(row.createdAt) },
        ]}
        rowActions={(row) => (
          <Link
            href={`/ai/runs/${row.runId}`}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Open trace
          </Link>
        )}
      />
    </div>
  );
}
