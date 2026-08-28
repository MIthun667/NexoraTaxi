'use client';

import { CheckCircle2, Clock3, ShieldAlert, Sparkles } from 'lucide-react';

import { ErrorState } from '@/components/layout/error-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { Select } from '@/components/ui/select';
import { TableToolbar } from '@/components/tables/table-toolbar';
import { useDemoContext } from '@/hooks/use-demo-context';
import {
  useAgentProposals,
  useApproveProposal,
  useRejectProposal,
} from '@/hooks/queries/use-ai-command-center';
import { useListQueryState } from '@/hooks/use-list-query-state';
import { MetricCard } from '@/modules/shared/components/metric-card';

import { ProposalReviewCard } from './proposal-review-card';

export function ActionProposalsScreen() {
  const { query, updateQuery, resetQuery } = useListQueryState(12);
  const activeContext = useDemoContext();
  const proposals = useAgentProposals({
    page: query.page,
    limit: 50,
    search: query.search || undefined,
    organizationId: activeContext.selectedOrganizationId || undefined,
    riskLevel: query.severity || undefined,
    agentCode: query.agentCode || undefined,
  });
  const approve = useApproveProposal();
  const reject = useRejectProposal();

  if (proposals.isLoading) {
    return (
      <LoadingState
        title="Loading action proposals..."
        description="Collecting proposed actions that need operator review or governance intervention."
      />
    );
  }

  if (proposals.isError) {
    return <ErrorState title="Unable to load action proposals." onRetry={() => proposals.refetch()} />;
  }

  const statusFilter = query.status || '';
  const filteredProposals = (proposals.data?.items ?? []).filter((proposal) => {
    if (statusFilter === 'pending') {
      return (
        proposal.status !== 'REJECTED' &&
        proposal.status !== 'EXECUTED' &&
        proposal.executionStatus !== 'SUCCEEDED' &&
        proposal.executionStatus !== 'PENDING_APPROVAL' &&
        !proposal.approvalRequestId
      );
    }

    if (statusFilter === 'handled') {
      return (
        proposal.status === 'REJECTED' ||
        proposal.status === 'EXECUTED' ||
        proposal.executionStatus === 'SUCCEEDED' ||
        proposal.executionStatus === 'PENDING_APPROVAL' ||
        Boolean(proposal.approvalRequestId)
      );
    }

    return true;
  });

  const pendingCount = filteredProposals.filter((proposal) => proposal.status !== 'REJECTED' && proposal.status !== 'EXECUTED').length;
  const handledCount = filteredProposals.length - pendingCount;
  const criticalCount = filteredProposals.filter((proposal) => proposal.riskLevel === 'CRITICAL' || proposal.riskLevel === 'HIGH').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Proposal review"
        title="Action Proposals"
        description="Review, route, or dismiss proposed actions."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Visible proposals" value={filteredProposals.length} description="Structured proposals visible in the current review scope." icon={Sparkles} />
        <MetricCard title="Pending review" value={pendingCount} description="Items still waiting for a human decision." icon={Clock3} />
        <MetricCard title="Handled" value={handledCount} description="Items already routed or dismissed." icon={CheckCircle2} />
        <MetricCard title="High priority" value={criticalCount} description="High or critical proposals that deserve first review." icon={ShieldAlert} />
      </div>

      <TableToolbar
        searchValue={query.search}
        searchPlaceholder="Search by action type, summary, or target entity"
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        onReset={() => resetQuery(['search', 'page', 'status', 'severity', 'agentCode'])}
        filters={
          <>
            <Select
              value={query.status}
              onChange={(event) => updateQuery({ status: event.target.value, page: 1 })}
              className="w-[220px]"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending review</option>
              <option value="handled">Handled</option>
            </Select>
            <Select
              value={query.agentCode}
              onChange={(event) => updateQuery({ agentCode: event.target.value, page: 1 })}
              className="w-[220px]"
            >
              <option value="">All agents</option>
              <option value="workforce-readiness-agent">Workforce Readiness Agent</option>
              <option value="operations-control-agent">Operations Agent</option>
              <option value="revenue-operations-agent">Revenue Operations Agent</option>
            </Select>
            <Select
              value={query.severity}
              onChange={(event) => updateQuery({ severity: event.target.value, page: 1 })}
              className="w-[180px]"
            >
              <option value="">All risk levels</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </Select>
          </>
        }
      />

      <div className="grid gap-4">
        {filteredProposals.length ? (
          filteredProposals.slice(0, query.limit).map((proposal) => (
            <ProposalReviewCard
              key={proposal.id}
              proposal={proposal}
              onApprove={(comment) => approve.mutate({ id: proposal.id, reviewerComment: comment })}
              onReject={(comment) => reject.mutate({ id: proposal.id, reviewerComment: comment })}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
            No verified action proposals match the current review filters in this scope.
          </div>
        )}
      </div>
    </div>
  );
}
