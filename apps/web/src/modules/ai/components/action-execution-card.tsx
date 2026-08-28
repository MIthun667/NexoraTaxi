'use client';

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlayCircle, 
  AlertCircle,
  FileText,
  User,
  History,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ActionExecutionView } from '@/types/ai';

interface ActionExecutionCardProps {
  execution: ActionExecutionView;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onFeedback?: (id: string, type: 'POSITIVE' | 'NEGATIVE') => void;
  showDetails?: boolean;
}

export function ActionExecutionCard({
  execution,
  onApprove,
  onReject,
  onFeedback,
  showDetails = false
}: ActionExecutionCardProps) {
  const isPendingApproval = execution.approvalStatus === 'PENDING';
  const isExecuting = execution.status === 'EXECUTING';
  const isCompleted = execution.status === 'COMPLETED';
  const isFailed = execution.status === 'FAILED';
  const isRejected = execution.status === 'REJECTED';

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (isFailed) return <XCircle className="h-5 w-5 text-red-500" />;
    if (isExecuting) return <PlayCircle className="h-5 w-5 text-blue-500 animate-pulse" />;
    if (isPendingApproval) return <Clock className="h-5 w-5 text-amber-500" />;
    if (isRejected) return <AlertCircle className="h-5 w-5 text-slate-500" />;
    return <Clock className="h-5 w-5 text-slate-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'FAILED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'EXECUTING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'PENDING': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'REJECTED': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <Card className="overflow-hidden border-white/10 bg-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-base font-bold text-white">
                {execution.type.replace(/_/g, ' ')}
              </CardTitle>
              <div className="text-xs text-slate-400 mt-0.5">
                ID: {execution.id.split('-')[0]} • {formatDateTime(execution.createdAt)}
              </div>
            </div>
          </div>
          <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em]", getStatusColor(execution.status))}>
            {execution.status}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        {execution.proposal && (
          <div className="mb-4 rounded-xl bg-white/[0.03] p-3 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <FileText className="h-3 w-3" />
              Linked Proposal
            </div>
            <p className="text-sm font-medium text-slate-200">{execution.proposal.title}</p>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{execution.proposal.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-1">Requested By</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <User className="h-3 w-3" />
              {execution.requestedByUser ? `${execution.requestedByUser.firstName} ${execution.requestedByUser.lastName}` : 'System Agent'}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Approval Status</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                {execution.approvalStatus}
              </span>
            </div>
          </div>
        </div>

        {execution.error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400">
            <div className="font-bold mb-1">Execution Error</div>
            {execution.error}
          </div>
        )}

        {execution.result !== null && execution.result !== undefined && showDetails && (
          <div className="mt-4 p-3 rounded-xl bg-slate-500/5 border border-white/10 text-xs font-mono text-slate-400 overflow-x-auto">
             <pre>{JSON.stringify(execution.result, null, 2)}</pre>
          </div>
        )}

        {showDetails && execution.auditTrail && execution.auditTrail.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              <History className="h-3 w-3" />
              Audit Trail
            </div>
            <div className="space-y-3 border-l border-white/10 ml-1.5 pl-4">
              {execution.auditTrail.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-white/20 border border-white/5" />
                  <div className="text-xs font-medium text-slate-300">{log.action.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-slate-500">{formatDateTime(log.createdAt)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCompleted && !execution.outcome && onFeedback && (
          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Operator Feedback</p>
            <div className="flex items-center gap-3">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 px-3 text-[11px] border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400"
                onClick={() => onFeedback(execution.id, 'POSITIVE')}
              >
                <ThumbsUp className="mr-2 h-3 w-3" />
                This helped
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 px-3 text-[11px] border-white/10 hover:bg-rose-500/10 hover:text-rose-400"
                onClick={() => onFeedback(execution.id, 'NEGATIVE')}
              >
                <ThumbsDown className="mr-2 h-3 w-3" />
                Not useful
              </Button>
            </div>
          </div>
        )}

        {execution.outcome && (
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outcome Recorded</span>
              <span className={cn(
                "inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em]",
                execution.outcome.outcomeType === 'POSITIVE' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}>
                {execution.outcome.outcomeType}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {isPendingApproval && onApprove && onReject && (
        <div className="flex gap-2 border-t border-white/5 bg-white/[0.02] px-4 py-4">
          <Button 
            size="sm" 
            variant="ghost" 
            className="flex-1 text-xs text-slate-400 hover:text-white hover:bg-white/5"
            onClick={() => onReject(execution.id)}
          >
            Reject
          </Button>
          <Button 
            size="sm" 
            className="flex-1 text-xs bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
            onClick={() => onApprove(execution.id)}
          >
            Approve & Execute
          </Button>
        </div>
      )}
    </Card>
  );
}
